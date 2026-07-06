from pathlib import Path
from uuid import uuid4

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db, settings
from ..models import Dataset, User, LineageLog
from ..quality import (
    analyze_dataframe,
    clean_dataframe,
    json_dumps,
    json_loads,
    preprocess_dataframe,
    read_dataset,
    train_dataset_model,
)
from ..schemas import AnalysisOut, DatasetOut, LineageLogOut

router = APIRouter()


def add_lineage_log(db: Session, dataset_id: int, user_id: int, action: str, details: str):
    log = LineageLog(
        dataset_id=dataset_id,
        user_id=user_id,
        action=action,
        details=details
    )
    db.add(log)
    db.commit()


def prepare_lineage_logs(logs: list[LineageLog]) -> list[LineageLogOut]:
    res = []
    for l in logs:
        out = LineageLogOut.model_validate(l)
        out.user_name = l.user.name if l.user else "Unknown"
        out.dataset_filename = l.dataset.filename if l.dataset else "Unknown"
        res.append(out)
    res.sort(key=lambda x: x.created_at)
    return res
def get_original_path(stored_path: str) -> str:
    path = Path(stored_path)
    name = path.name
    parts = name.split("_")
    for i, part in enumerate(parts):
        if len(part) == 32 and all(c in "0123456789abcdef" for c in part):
            original_name = "_".join(parts[i:])
            return str(path.with_name(original_name))
    return stored_path


def prepare_dataset_out(d: Dataset) -> DatasetOut:
    out = DatasetOut.model_validate(d)
    out.owner_name = d.owner.name if d.owner else "System"
    return out


def get_dataset_or_404(dataset_id: int, user: User, db: Session) -> Dataset:
    # A user can have access to datasets uploaded by all other users
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/upload", response_model=AnalysisOut)
async def upload_dataset(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}_{file.filename}"
    stored_path = upload_dir / stored_name
    stored_path.write_bytes(await file.read())

    try:
        df = read_dataset(stored_path)
        analysis = analyze_dataframe(df)
    except Exception as exc:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Could not read CSV file: {exc}") from exc

    dataset = Dataset(
        filename=file.filename,
        stored_path=str(stored_path),
        rows_count=analysis["rows_count"],
        columns_count=analysis["columns_count"],
        quality_score=analysis["quality_score"],
        status="analyzed",
        analysis_json=json_dumps(analysis),
        owner_id=user.id,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    
    add_lineage_log(
        db=db,
        dataset_id=dataset.id,
        user_id=user.id,
        action="upload",
        details=f"Dataset uploaded by {user.name}. Columns: {dataset.columns_count}, Rows: {dataset.rows_count}. Quality score: {dataset.quality_score}%"
    )
    
    return {
        "dataset": prepare_dataset_out(dataset),
        "analysis": analysis,
        "lineage_logs": prepare_lineage_logs(dataset.lineage_logs)
    }


@router.get("", response_model=list[DatasetOut])
def list_datasets(
    search: str | None = Query(None, description="Search datasets by name"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve all datasets to support sharing, sorted by creation date
    query = db.query(Dataset)
    if search:
        query = query.filter(Dataset.filename.ilike(f"%{search}%"))
    
    datasets = query.order_by(Dataset.created_at.desc()).all()
    
    # Map to schema and populate owner_name
    return [prepare_dataset_out(d) for d in datasets]


@router.get("/summary/user")
def user_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_uploads = db.query(Dataset).filter(Dataset.owner_id == user.id).count()
    total_downloads = (
        db.query(LineageLog)
        .filter(LineageLog.user_id == user.id, LineageLog.action == "export")
        .count()
    )
    
    recent_activity = (
        db.query(LineageLog)
        .filter(LineageLog.user_id == user.id)
        .order_by(LineageLog.created_at.desc())
        .limit(5)
        .all()
    )
    
    my_datasets = (
        db.query(Dataset)
        .filter(Dataset.owner_id == user.id)
        .order_by(Dataset.created_at.desc())
        .all()
    )
    
    avg_quality = db.query(func.avg(Dataset.quality_score)).filter(Dataset.owner_id == user.id).scalar() or 0
    
    return {
        "total_uploads": total_uploads,
        "total_downloads": total_downloads,
        "average_quality_score": round(float(avg_quality), 2),
        "recent_activity": prepare_lineage_logs(recent_activity),
        "my_datasets": [prepare_dataset_out(d) for d in my_datasets]
    }


@router.get("/downloads/history")
def get_download_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(LineageLog).filter(LineageLog.action == "export")
    if user.role != "admin":
        query = query.filter(LineageLog.user_id == user.id)

    logs = query.order_by(LineageLog.created_at.desc()).all()

    history = []
    for l in logs:
        if l.dataset:
            history.append({
                "log_id": l.id,
                "dataset_id": l.dataset_id,
                "filename": l.dataset.filename,
                "quality_score": l.dataset.quality_score,
                "status": l.dataset.status,
                "downloaded_at": l.created_at.isoformat(),
                "details": l.details,
                "downloaded_by": l.user.name if l.user else "Unknown"
            })
    return history


@router.get("/{dataset_id}/analysis", response_model=AnalysisOut)
def get_analysis(
    dataset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(dataset_id, user, db)
    return {
        "dataset": prepare_dataset_out(dataset),
        "analysis": json_loads(dataset.analysis_json),
        "lineage_logs": prepare_lineage_logs(dataset.lineage_logs)
    }


@router.post("/{dataset_id}/clean", response_model=AnalysisOut)
def clean_dataset_route(
    dataset_id: int,
    imputation_strategy: str = Query("median", description="Strategy: mean, median, mode, constant, knn"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(dataset_id, user, db)
    
    # Always read from the original uploaded path to avoid double cleaning / scaling
    original_path = get_original_path(dataset.stored_path)
    df = read_dataset(original_path)
    
    cleaned = clean_dataframe(df, imputation_strategy=imputation_strategy)

    clean_path = Path(original_path).with_name(f"cleaned_{Path(original_path).name}")
    cleaned.to_csv(clean_path, index=False)
    
    existing_analysis = json_loads(dataset.analysis_json)
    analysis = analyze_dataframe(cleaned)
    analysis["imputation_strategy"] = imputation_strategy
    
    # Carry forward original analysis
    if "original_analysis" in existing_analysis:
        analysis["original_analysis"] = existing_analysis["original_analysis"]
    else:
        orig_copy = existing_analysis.copy()
        for k in ["preprocessing_report", "training_report", "original_analysis", "imputation_strategy"]:
            orig_copy.pop(k, None)
        analysis["original_analysis"] = orig_copy

    # Carry forward existing metadata
    for key in ["preprocessing_report", "training_report"]:
        if key in existing_analysis:
            analysis[key] = existing_analysis[key]

    dataset.stored_path = str(clean_path)
    dataset.rows_count = analysis["rows_count"]
    dataset.columns_count = analysis["columns_count"]
    dataset.quality_score = analysis["quality_score"]
    dataset.status = "cleaned"
    dataset.analysis_json = json_dumps(analysis)
    db.commit()
    db.refresh(dataset)

    add_lineage_log(
        db=db,
        dataset_id=dataset.id,
        user_id=user.id,
        action="cleaning",
        details=f"Applied numeric data cleaning using strategy '{imputation_strategy}'. New quality score: {dataset.quality_score}%"
    )

    return {
        "dataset": prepare_dataset_out(dataset),
        "analysis": analysis,
        "lineage_logs": prepare_lineage_logs(dataset.lineage_logs)
    }


@router.post("/{dataset_id}/preprocess", response_model=AnalysisOut)
def preprocess_dataset_route(
    dataset_id: int,
    outlier_method: str = Query("iqr", description="Method: iqr, zscore, isolation_forest, none"),
    scaling_method: str = Query("standard", description="Method: standard, minmax, robust, none"),
    target_column: str | None = Query(None, description="Optional target column to exclude from preprocessing"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(dataset_id, user, db)
    
    # Find original and cleaned file paths
    original_path = get_original_path(dataset.stored_path)
    clean_path = Path(original_path).with_name(f"cleaned_{Path(original_path).name}")
    
    # If it was cleaned previously, build preprocessing on the cleaned file. Otherwise, build on the original.
    if clean_path.exists():
        source_path = str(clean_path)
        prefix = "preprocessed_cleaned_"
    else:
        source_path = original_path
        prefix = "preprocessed_"

    df = read_dataset(source_path)
    processed, preprocessing_report = preprocess_dataframe(
        df, outlier_method=outlier_method, scaling_method=scaling_method, target_column=target_column
    )

    processed_path = Path(original_path).with_name(f"{prefix}{Path(original_path).name}")
    processed.to_csv(processed_path, index=False)
    
    existing_analysis = json_loads(dataset.analysis_json)
    analysis = analyze_dataframe(processed)
    analysis["preprocessing_report"] = preprocessing_report
    
    # Carry forward original analysis
    if "original_analysis" in existing_analysis:
        analysis["original_analysis"] = existing_analysis["original_analysis"]
    else:
        orig_copy = existing_analysis.copy()
        for k in ["preprocessing_report", "training_report", "original_analysis", "imputation_strategy"]:
            orig_copy.pop(k, None)
        analysis["original_analysis"] = orig_copy

    # Carry forward existing metadata
    for key in ["imputation_strategy", "training_report"]:
        if key in existing_analysis:
            analysis[key] = existing_analysis[key]

    dataset.stored_path = str(processed_path)
    dataset.rows_count = analysis["rows_count"]
    dataset.columns_count = analysis["columns_count"]
    dataset.quality_score = analysis["quality_score"]
    dataset.status = "preprocessed"
    dataset.analysis_json = json_dumps(analysis)
    db.commit()
    db.refresh(dataset)

    add_lineage_log(
        db=db,
        dataset_id=dataset.id,
        user_id=user.id,
        action="preprocessing",
        details=f"Applied feature preprocessing (outliers: '{outlier_method}', scaling: '{scaling_method}'). Quality score: {dataset.quality_score}%"
    )

    return {
        "dataset": prepare_dataset_out(dataset),
        "analysis": analysis,
        "lineage_logs": prepare_lineage_logs(dataset.lineage_logs)
    }


@router.post("/{dataset_id}/train", response_model=AnalysisOut)
def train_dataset_route(
    dataset_id: int,
    target_column: str | None = Query(None, description="Column to predict"),
    algorithm: str | None = Query(None, description="Model type (e.g. random_forest, linear_regression, logistic_regression, svm, gradient_boosting, auto)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(dataset_id, user, db)
    df = read_dataset(dataset.stored_path)
    
    # Train the model and get report
    training_report = train_dataset_model(df, target_column=target_column, algorithm=algorithm)
    
    analysis = json_loads(dataset.analysis_json) or analyze_dataframe(df)
    analysis["training_report"] = training_report

    dataset.status = "trained"
    dataset.analysis_json = json_dumps(analysis)
    db.commit()
    db.refresh(dataset)

    model_type = training_report.get("model_type", "auto")
    best_algo = training_report.get("algo", algorithm or "auto")
    metrics = training_report.get("metrics", {})
    
    score_desc = ""
    if "accuracy" in metrics:
        score_desc = f", accuracy: {metrics['accuracy']}"
    elif "r2_score" in metrics:
        score_desc = f", R²: {metrics['r2_score']}"
    elif "mean_absolute_error" in metrics:
        score_desc = f", MAE: {metrics['mean_absolute_error']}"

    add_lineage_log(
        db=db,
        dataset_id=dataset.id,
        user_id=user.id,
        action="training",
        details=f"Trained ML model targeting '{target_column}' using algorithm '{best_algo}' ({model_type}){score_desc}."
    )

    return {
        "dataset": prepare_dataset_out(dataset),
        "analysis": analysis,
        "lineage_logs": prepare_lineage_logs(dataset.lineage_logs)
    }


@router.get("/{dataset_id}/export")
def export_dataset(
    dataset_id: int,
    format: str = "csv",
    version: str = Query("current", description="Version: raw, processed, current"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(dataset_id, user, db)
    
    if version == "raw":
        path = Path(get_original_path(dataset.stored_path))
        if not path.exists():
            raise HTTPException(status_code=404, detail="Original raw dataset not found on disk")
    elif version == "processed":
        if dataset.status == "analyzed":
            raise HTTPException(
                status_code=400,
                detail="Dataset has not been processed yet. Execute data cleaning or preprocessing first."
            )
        path = Path(dataset.stored_path)
    else:
        path = Path(dataset.stored_path)

    if format == "csv":
        add_lineage_log(
            db=db,
            dataset_id=dataset.id,
            user_id=user.id,
            action="export",
            details=f"Dataset exported as CSV by {user.name}."
        )
        return FileResponse(path, filename=f"export_{dataset.filename}", media_type="text/csv")

    if format == "json":
        add_lineage_log(
            db=db,
            dataset_id=dataset.id,
            user_id=user.id,
            action="export",
            details=f"Dataset exported as JSON by {user.name}."
        )
        df = pd.read_csv(path)
        return JSONResponse(content=df.fillna("").to_dict(orient="records"))

    if format == "excel":
        add_lineage_log(
            db=db,
            dataset_id=dataset.id,
            user_id=user.id,
            action="export",
            details=f"Dataset exported as Excel by {user.name}."
        )
        import io
        df = pd.read_csv(path)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Dataset")
        output.seek(0)
        
        filename = Path(dataset.filename).with_suffix(".xlsx").name
        headers = {
            "Content-Disposition": f"attachment; filename=export_{filename}"
        }
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )

    raise HTTPException(status_code=400, detail="Export format must be csv, json, or excel")
