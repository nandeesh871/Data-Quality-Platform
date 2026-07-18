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
        "source": "huggingface",  # We can pull directly via raw URL
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

def get_hf_csv_path(ds_id: str) -> str | None:
    try:
        url = f"https://huggingface.co/api/datasets/{ds_id}/tree/main"
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200:
            files = resp.json()
            for f in files:
                path = f.get("path", "")
                if path.endswith(".csv"):
                    return path
    except Exception:
        pass
    return None

def search_huggingface(query: str) -> list[dict]:
    results = []
    try:
        url = "https://huggingface.co/api/datasets"
        resp = requests.get(url, params={"search": query, "limit": 15}, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            ds_ids = [item.get("id", "") for item in data if item.get("id")]
            
            with ThreadPoolExecutor(max_workers=5) as executor:
                csv_paths = list(executor.map(get_hf_csv_path, ds_ids))
            
            for item, csv_path in zip(data, csv_paths):
                if csv_path:
                    ds_id = item.get("id")
                    download_url = f"https://huggingface.co/datasets/{ds_id}/resolve/main/{csv_path}"
                    desc = item.get("description", "")
                    if not desc:
                        desc = f"Hugging Face dataset by {item.get('author', 'unknown')}. Downloads: {item.get('downloads', 0)}."
                    
                    results.append({
                        "id": ds_id,
                        "name": ds_id.split("/")[-1],
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
        # Query Kaggle's public web search API (no credentials needed)
        url = "https://www.kaggle.com/api/v1/datasets/list"
        resp = requests.get(url, params={"search": query}, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            for ds in data:
                ref = ds.get("ref", "")
                title = ds.get("title", "").strip()
                subtitle = ds.get("subtitle", "")
                size_bytes = ds.get("totalBytes", 0)
                
                # Convert bytes to human readable size
                if size_bytes < 1024:
                    size_str = f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
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

@router.get("/debug-search")
def debug_search(q: str = ""):
    hf_status = None
    hf_preview = ""
    kaggle_status = None
    kaggle_preview = ""
    
    try:
        url = "https://huggingface.co/api/datasets"
        resp = requests.get(url, params={"search": q, "limit": 5}, timeout=5)
        hf_status = resp.status_code
        hf_preview = resp.text[:400]
    except Exception as e:
        hf_preview = f"Error: {e}"

    try:
        url = "https://www.kaggle.com/api/v1/datasets/list"
        resp = requests.get(url, params={"search": q}, timeout=5)
        kaggle_status = resp.status_code
        kaggle_preview = resp.text[:400]
    except Exception as e:
        kaggle_preview = f"Error: {e}"

    return {
        "huggingface": {"status": hf_status, "preview": hf_preview},
        "kaggle": {"status": kaggle_status, "preview": kaggle_preview}
    }

@router.get("/search")
def search_datasets(q: str = ""):
    if not q:
        # Return popular templates if query is empty
        return POPULAR_TEMPLATES

    hf_results = search_huggingface(q)
    kaggle_results = search_kaggle(q)
    
    # Merge results
    return hf_results + kaggle_results

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

    if source == "huggingface":
        try:
            # 1. Download file via HTTP
            resp = requests.get(download_url, stream=True, timeout=30)
            if resp.status_code != 200:
                raise Exception(f"Failed to fetch file. HTTP {resp.status_code}")

            # Define clean file name
            clean_name = dataset_name.replace("/", "_")
            if not clean_name.endswith(".csv"):
                clean_name += ".csv"
            
            stored_name = f"{int(time.time())}_{clean_name}"
            file_path = os.path.join(settings.upload_dir, stored_name)

            with open(file_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)

            # 2. Get CSV rows/cols metadata
            rows_count = 0
            cols_count = 0
            try:
                import pandas as pd
                df = pd.read_csv(file_path)
                rows_count = len(df)
                cols_count = len(df.columns)
            except Exception:
                pass

            # 3. Create Dataset record
            db_dataset = Dataset(
                filename=clean_name,
                stored_path=file_path,
                rows_count=rows_count,
                columns_count=cols_count,
                quality_score=0.0,
                status="uploaded",
                source="huggingface",
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
                details=f"Imported dataset '{clean_name}' from Hugging Face Hub."
            )
            db.add(log)
            db.commit()

            return db_dataset
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Hugging Face import failed: {str(e)}")

    elif source == "kaggle":
        # Check Kaggle Credentials first
        if not os.environ.get("KAGGLE_USERNAME") and not os.path.exists(os.path.expanduser("~/.kaggle/kaggle.json")):
            raise HTTPException(
                status_code=400,
                detail="Kaggle API credentials are not configured on this server. To import Kaggle datasets, please set KAGGLE_USERNAME and KAGGLE_KEY environment variables in your Render backend settings."
            )
        try:
            from kaggle.api.kaggle_api_extended import KaggleApi
            api = KaggleApi()
            api.authenticate()

            # Download using Kaggle Api in a temp folder
            with tempfile.TemporaryDirectory() as tmpdir:
                api.dataset_download_files(full_name, path=tmpdir, unzip=True)
                
                # Scan for CSV files
                csv_file = None
                for root, _, files in os.walk(tmpdir):
                    for file in files:
                        if file.endswith(".csv"):
                            csv_file = os.path.join(root, file)
                            break
                    if csv_file:
                        break

                if not csv_file:
                    raise Exception("No CSV files found in the Kaggle dataset package.")

                # Save to uploads
                original_filename = os.path.basename(csv_file)
                stored_name = f"{int(time.time())}_{original_filename}"
                file_path = os.path.join(settings.upload_dir, stored_name)
                shutil.copy(csv_file, file_path)

            # Get metadata
            rows_count = 0
            cols_count = 0
            try:
                import pandas as pd
                df = pd.read_csv(file_path)
                rows_count = len(df)
                cols_count = len(df.columns)
            except Exception:
                pass

            # Create Database entries
            db_dataset = Dataset(
                filename=original_filename,
                stored_path=file_path,
                rows_count=rows_count,
                columns_count=cols_count,
                quality_score=0.0,
                status="uploaded",
                source="kaggle",
                owner_id=current_user.id
            )
            db.add(db_dataset)
            db.commit()
            db.refresh(db_dataset)

            # Log
            log = LineageLog(
                dataset_id=db_dataset.id,
                user_id=current_user.id,
                action="Import",
                details=f"Imported dataset '{original_filename}' from Kaggle Hub."
            )
            db.add(log)
            db.commit()

            return db_dataset
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Kaggle import failed: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported import source: {source}")
