import os
import time
import random
import zipfile
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor
import requests
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db, settings
from app.models import Dataset, LineageLog
from app.routers.auth import get_current_user
from app.schemas import DatasetOut

router = APIRouter()

# Popular quick-import templates for demonstrations
POPULAR_TEMPLATES = [
    {
        "id": "titanic",
        "name": "Titanic - Machine Learning from Disaster",
        "fullName": "heptarhee/titanic",
        "description": "The classic dataset for binary classification. Predict survival (passenger attributes like class, age, gender).",
        "size": "60 KB",
        "download_url": "https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv",
        "source": "huggingface",
        "isTemplate": True
    },
    {
        "id": "iris",
        "name": "Iris Flower Classification",
        "fullName": "uciml/iris",
        "description": "Standard multi-class classification dataset featuring length and width measurements of sepals and petals.",
        "size": "4 KB",
        "download_url": "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv",
        "source": "huggingface",
        "isTemplate": True
    },
    {
        "id": "wine-quality",
        "name": "Wine Quality Analysis",
        "fullName": "uciml/wine-quality-dataset",
        "description": "Assess red and white Portuguese 'Vinho Verde' wine quality based on physicochemical tests.",
        "size": "260 KB",
        "download_url": "https://raw.githubusercontent.com/stedy/Machine-Learning-with-R-datasets/master/winequality-white.csv",
        "source": "huggingface",
        "isTemplate": True
    },
    {
        "id": "house-prices",
        "name": "House Prices Regression",
        "fullName": "lespin/house-prices-dataset",
        "description": "Predict sales prices of homes based on 79 explanatory variables describing residential aspects.",
        "size": "460 KB",
        "download_url": "https://raw.githubusercontent.com/groverpr/Predict-House-Prices/master/HousePrices.csv",
        "source": "huggingface",
        "isTemplate": True
    }
]

# Helper to scan a single HF dataset tree in parallel
def get_hf_csv_path(ds_id: str) -> str | None:
    try:
        url = f"https://huggingface.co/api/datasets/{ds_id}"
        resp = requests.get(url, timeout=4)
        if resp.status_code == 200:
            info = resp.json()
            siblings = info.get("siblings", [])
            for f in siblings:
                path = f.get("rfilename", "")
                if path.endswith(".csv"):
                    return path
    except Exception:
        pass
    return None

def search_huggingface(query: str) -> list[dict]:
    results = []
    try:
        url = "https://huggingface.co/api/datasets"
        resp = requests.get(url, params={"search": query, "limit": 10}, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            ds_ids = [item.get("id", "") for item in data if item.get("id")]
            
            with ThreadPoolExecutor(max_workers=5) as executor:
                csv_paths = list(executor.map(get_hf_csv_path, ds_ids))
            
            for item, csv_path in zip(data, csv_paths):
                if csv_path:
                    ds_id = item.get("id")
                    download_url = f"https://huggingface.co/datasets/{ds_id}/raw/main/{csv_path}"
                    desc = item.get("description", "")
                    if not desc:
                        desc = f"Hugging Face dataset by {item.get('author', 'unknown')}. Downloads: {item.get('downloads', 0)}."
                    
                    results.append({
                        "id": ds_id,
                        "name": ds_id.split("/")[-1].replace("-", " ").title(),
                        "fullName": ds_id,
                        "description": desc[:250] + "..." if len(desc) > 250 else desc,
                        "size": "Public Hub",
                        "download_url": download_url,
                        "source": "huggingface",
                        "isTemplate": False
                    })
    except Exception as e:
        print(f"Hugging Face search error: {e}")
    return results

def search_kaggle(query: str) -> list[dict]:
    results = []
    try:
        url = "https://www.kaggle.com/api/v1/datasets/list"
        resp = requests.get(url, params={"search": query}, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            for ds in data:
                ref = ds.get("ref", "")
                title = ds.get("title", "").strip()
                subtitle = ds.get("subtitle", "")
                size_bytes = ds.get("totalBytes", 0)
                
                if size_bytes < 1024 * 1024:
                    size_str = f"{size_bytes / 1024:.1f} KB"
                else:
                    size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
                
                desc = subtitle if subtitle else f"Kaggle dataset by {ref.split('/')[0]}. Downloads: {ds.get('downloadCount', 0)}."
                
                results.append({
                    "id": ref,
                    "name": title,
                    "fullName": ref,
                    "description": desc[:250] + "..." if len(desc) > 250 else desc,
                    "size": size_str,
                    "download_url": ref,
                    "source": "kaggle",
                    "isTemplate": False
                })
    except Exception as e:
        print(f"Kaggle public search error: {e}")
    return results

def search_datagov(query: str) -> list[dict]:
    results = []
    try:
        url = "https://api.gsa.gov/technology/datagov/v3/action/package_search"
        resp = requests.get(url, params={"q": query, "api_key": "DEMO_KEY", "rows": 25}, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            packages = data.get("result", {}).get("results", [])
            for pkg in packages:
                title = pkg.get("title", "").strip()
                notes = pkg.get("notes", "") or ""
                resources = pkg.get("resources", [])
                
                csv_url = None
                for res in resources:
                    res_url = res.get("url", "")
                    fmt = str(res.get("format", "")).lower()
                    if "csv" in fmt or "comma" in fmt or res_url.lower().endswith(".csv") or "rows.csv" in res_url.lower():
                        csv_url = res_url
                        break
                
                if csv_url:
                    results.append({
                        "id": pkg.get("id", ""),
                        "name": title,
                        "fullName": title,
                        "description": notes[:250] + "..." if len(notes) > 250 else notes,
                        "size": "U.S. Data.gov Portal",
                        "download_url": csv_url,
                        "source": "datagov",
                        "isTemplate": False
                    })
    except Exception as e:
        print(f"Data.gov search error: {e}")
    return results

# Helper to scan a single Datahub repo contents in parallel
def get_datahub_csv_url(repo_name: str) -> str | None:
    try:
        url = f"https://api.github.com/repos/datasets/{repo_name}/contents/data"
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200:
            files = resp.json()
            for f in files:
                name = f.get("name", "")
                if name.endswith(".csv"):
                    return f.get("download_url")
        
        # Check root
        url = f"https://api.github.com/repos/datasets/{repo_name}/contents"
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200:
            files = resp.json()
            for f in files:
                name = f.get("name", "")
                if name.endswith(".csv"):
                    return f.get("download_url")
    except Exception:
        pass
    return None

def search_datahub(query: str) -> list[dict]:
    results = []
    try:
        url = "https://api.github.com/search/repositories"
        resp = requests.get(url, params={"q": f"org:datasets {query}"}, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])[:8]
            repo_names = [item.get("name", "") for item in items if item.get("name")]
            
            with ThreadPoolExecutor(max_workers=5) as executor:
                csv_urls = list(executor.map(get_datahub_csv_url, repo_names))
            
            for item, csv_url in zip(items, csv_urls):
                if csv_url:
                    name = item.get("name", "")
                    desc = item.get("description", "") or f"Curated dataset from Datahub.io catalog: {name}."
                    results.append({
                        "id": name,
                        "name": name.replace("-", " ").title(),
                        "fullName": f"datasets/{name}",
                        "description": desc[:250] + "..." if len(desc) > 250 else desc,
                        "size": "Datahub.io Catalog",
                        "download_url": csv_url,
                        "source": "datahub",
                        "isTemplate": False
                    })
    except Exception as e:
        print(f"Datahub search error: {e}")
    return results

@router.get("/check-credentials")
def check_credentials():
    import os
    username = os.environ.get("KAGGLE_USERNAME")
    key = os.environ.get("KAGGLE_KEY")
    home = os.path.expanduser("~")
    json_path = os.path.join(home, ".kaggle", "kaggle.json")
    json_exists = os.path.exists(json_path)
    
    return {
        "KAGGLE_USERNAME": {
            "is_set": username is not None,
            "length": len(username) if username else 0,
            "preview": username[:3] + "..." if username else ""
        },
        "KAGGLE_KEY": {
            "is_set": key is not None,
            "length": len(key) if key else 0,
            "preview": key[:3] + "..." if key else ""
        },
        "kaggle_json": {
            "exists": json_exists,
            "size": os.path.getsize(json_path) if json_exists else 0
        }
    }

@router.get("/search")
def search_datasets(q: str = ""):
    if not q:
        return POPULAR_TEMPLATES

    hf_results = search_huggingface(q)
    kaggle_results = search_kaggle(q)
    datagov_results = search_datagov(q)
    datahub_results = search_datahub(q)
    
    return hf_results + kaggle_results + datagov_results + datahub_results

@router.post("/import", response_model=DatasetOut)
def import_dataset(
    payload: dict,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    source = payload.get("source")
    download_url = payload.get("download_url")
    full_name = payload.get("fullName")
    dataset_name = payload.get("name", "dataset")

    if not source or not download_url or not full_name:
        raise HTTPException(status_code=400, detail="Missing required payload parameters")

    if source in ["huggingface", "datagov", "datahub"]:
        try:
            # 1. Download file via HTTP
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            resp = requests.get(download_url, headers=headers, stream=True, timeout=45)
            if resp.status_code != 200:
                raise Exception(f"Failed to fetch file. HTTP {resp.status_code}")

            clean_name = dataset_name.replace("/", "_")
            if not clean_name.endswith(".csv"):
                clean_name += ".csv"
            
            stored_name = f"{int(time.time())}_{clean_name}"
            file_path = os.path.join(settings.upload_dir, stored_name)

            with open(file_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=16384):
                    f.write(chunk)

            # 2. Get CSV rows/cols metadata and run profiler
            from app.quality import analyze_dataframe, read_dataset, json_dumps
            try:
                df = read_dataset(file_path)
                analysis = analyze_dataframe(df, file_path=file_path)
                analysis["download_url"] = download_url
                rows_count = analysis["rows_count"]
                columns_count = analysis["columns_count"]
                quality_score = analysis["quality_score"]
                analysis_json = json_dumps(analysis)
                status = "analyzed"
            except Exception as e:
                rows_count = 0
                columns_count = 0
                quality_score = 0.0
                analysis_json = None
                status = "uploaded"

            # 3. Create Dataset record
            db_dataset = Dataset(
                filename=clean_name,
                stored_path=file_path,
                rows_count=rows_count,
                columns_count=columns_count,
                quality_score=quality_score,
                status=status,
                source=source,
                analysis_json=analysis_json,
                owner_id=current_user.id
            )
            db.add(db_dataset)
            db.commit()
            db.refresh(db_dataset)

            # 4. Log Lineage
            log = LineageLog(
                dataset_id=db_dataset.id,
                user_id=current_user.id,
                action="Import",
                details=f"Imported dataset '{clean_name}' from {source}."
            )
            db.add(log)
            db.commit()

            return db_dataset
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"{source} import failed: {str(e)}")

    elif source == "kaggle":
        csv_file = None
        temp_dir = tempfile.mkdtemp()
        
        # 1. Attempt direct anonymous HTTP dataset zip download
        try:
            download_endpoint = f"https://www.kaggle.com/api/v1/datasets/download/{full_name}"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            resp = requests.get(download_endpoint, headers=headers, allow_redirects=True, stream=True, timeout=45)
            
            if resp.status_code == 200:
                zip_path = os.path.join(temp_dir, "kaggle_dataset.zip")
                with open(zip_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=16384):
                        f.write(chunk)
                
                if zipfile.is_zipfile(zip_path):
                    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                        zip_ref.extractall(temp_dir)
                    
                    for root, _, files in os.walk(temp_dir):
                        for file in files:
                            if file.endswith(".csv"):
                                csv_file = os.path.join(root, file)
                                break
                        if csv_file:
                            break
        except Exception as http_err:
            print(f"Kaggle direct HTTP download attempt failed: {http_err}")

        # 2. Fallback to Kaggle API using credentials if direct download wasn't possible
        if not csv_file:
            username = os.environ.get("KAGGLE_USERNAME")
            key = os.environ.get("KAGGLE_KEY")
            
            if username and key:
                try:
                    home = os.path.expanduser("~")
                    kaggle_dir = os.path.join(home, ".kaggle")
                    os.makedirs(kaggle_dir, exist_ok=True)
                    kaggle_json_path = os.path.join(kaggle_dir, "kaggle.json")
                    import json
                    with open(kaggle_json_path, "w") as f:
                        json.dump({"username": username.strip(), "key": key.strip()}, f)
                    os.chmod(kaggle_json_path, 0o600)
                except Exception as e:
                    print(f"Failed to write kaggle.json: {e}")

            try:
                from kaggle.api.kaggle_api_extended import KaggleApi
                api = KaggleApi()
                api.authenticate()
                api.dataset_download_files(full_name, path=temp_dir, unzip=True)
                
                for root, _, files in os.walk(temp_dir):
                    for file in files:
                        if file.endswith(".csv"):
                            csv_file = os.path.join(root, file)
                            break
                    if csv_file:
                        break
            except Exception as api_err:
                print(f"Kaggle API attempt failed: {api_err}")

        if not csv_file:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(
                status_code=400,
                detail=f"Could not download CSV file for Kaggle dataset '{full_name}'. Please verify the dataset contains a public CSV file."
            )

        try:
            clean_title = dataset_name.strip() if dataset_name and dataset_name != "dataset" else os.path.basename(csv_file)
            clean_title = clean_title.replace("/", "_").replace("\\", "_")
            if not clean_title.endswith(".csv"):
                clean_title += ".csv"

            stored_name = f"{int(time.time())}_{clean_title}"
            file_path = os.path.join(settings.upload_dir, stored_name)
            shutil.copy(csv_file, file_path)
            shutil.rmtree(temp_dir, ignore_errors=True)

            from app.quality import analyze_dataframe, read_dataset, json_dumps
            try:
                df = read_dataset(file_path)
                analysis = analyze_dataframe(df, file_path=file_path)
                analysis["kaggle_fullname"] = full_name
                analysis["download_url"] = f"https://www.kaggle.com/api/v1/datasets/download/{full_name}"
                rows_count = analysis["rows_count"]
                columns_count = analysis["columns_count"]
                quality_score = analysis["quality_score"]
                analysis_json = json_dumps(analysis)
                status = "analyzed"
            except Exception as e:
                rows_count = 0
                columns_count = 0
                quality_score = 0.0
                analysis_json = None
                status = "uploaded"

            db_dataset = Dataset(
                filename=clean_title,
                stored_path=file_path,
                rows_count=rows_count,
                columns_count=columns_count,
                quality_score=quality_score,
                status=status,
                source="kaggle",
                analysis_json=analysis_json,
                owner_id=current_user.id
            )
            db.add(db_dataset)
            db.commit()
            db.refresh(db_dataset)

            log = LineageLog(
                dataset_id=db_dataset.id,
                user_id=current_user.id,
                action="Import",
                details=f"Imported dataset '{clean_title}' from Kaggle Hub."
            )
            db.add(log)
            db.commit()

            return db_dataset
        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(status_code=500, detail=f"Kaggle import processing failed: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported import source: {source}")
