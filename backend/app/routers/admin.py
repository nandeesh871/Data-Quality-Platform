from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db, settings
from ..models import Dataset, User, LineageLog, SystemSetting
from ..schemas import AdminSummary, UserOut, UserRoleUpdate, LineageLogOut

router = APIRouter()


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/summary", response_model=AdminSummary)
def admin_summary(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_users = db.query(User).count()
    total_datasets = db.query(Dataset).count()
    average_quality = db.query(func.avg(Dataset.quality_score)).scalar() or 0
    cleaned_datasets = db.query(Dataset).filter(Dataset.status == "cleaned").count()
    preprocessed_datasets = db.query(Dataset).filter(Dataset.status == "preprocessed").count()
    trained_datasets = db.query(Dataset).filter(Dataset.status == "trained").count()
    total_rows = db.query(func.sum(Dataset.rows_count)).scalar() or 0
    total_columns = db.query(func.sum(Dataset.columns_count)).scalar() or 0
    status_rows = db.query(Dataset.status, func.count(Dataset.id)).group_by(Dataset.status).all()
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    recent_datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).limit(6).all()
    low_quality_datasets = db.query(Dataset).order_by(Dataset.quality_score.asc()).limit(5).all()

    recent_activities = (
        db.query(LineageLog)
        .order_by(LineageLog.created_at.desc())
        .limit(30)
        .all()
    )
    prepared_activities = []
    for l in recent_activities:
        out = LineageLogOut.model_validate(l)
        out.user_name = l.user.name if l.user else "Unknown"
        out.dataset_filename = l.dataset.filename if l.dataset else "Unknown"
        prepared_activities.append(out)

    return {
        "total_users": total_users,
        "total_datasets": total_datasets,
        "average_quality_score": round(float(average_quality), 2),
        "cleaned_datasets": cleaned_datasets,
        "preprocessed_datasets": preprocessed_datasets,
        "trained_datasets": trained_datasets,
        "total_rows": int(total_rows),
        "total_columns": int(total_columns),
        "status_counts": {status: count for status, count in status_rows},
        "project_modules": [
            "Authentication",
            "Dataset Upload",
            "Data Quality Analysis",
            "Data Cleaning",
            "Preprocessing and Transformation",
            "Model Training",
            "Dashboard Analytics",
            "CSV/JSON Export",
        ],
        "workflow_steps": [
            "Login",
            "Upload Dataset",
            "Analyze Quality",
            "Clean Missing Values and Duplicates",
            "Preprocess and Transform",
            "Train Dataset",
            "Export Results",
        ],
        "recent_users": recent_users,
        "recent_datasets": recent_datasets,
        "low_quality_datasets": low_quality_datasets,
        "recent_activities": prepared_activities,
    }


@router.get("/users", response_model=list[UserOut])
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete all datasets associated with user
    datasets = db.query(Dataset).filter(Dataset.owner_id == user.id).all()
    for dataset in datasets:
        try:
            path = Path(dataset.stored_path)
            path.unlink(missing_ok=True)
            clean_path = path.with_name(f"cleaned_{path.name}")
            clean_path.unlink(missing_ok=True)
            prep_path = path.with_name(f"preprocessed_{path.name}")
            prep_path.unlink(missing_ok=True)
        except Exception:
            pass
        db.delete(dataset)

    db.delete(user)
    db.commit()
    return {"message": f"User {user.name} and their datasets deleted successfully"}


@router.delete("/datasets/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        path = Path(dataset.stored_path)
        path.unlink(missing_ok=True)
        clean_path = path.with_name(f"cleaned_{path.name}")
        clean_path.unlink(missing_ok=True)
        prep_path = path.with_name(f"preprocessed_{path.name}")
        prep_path.unlink(missing_ok=True)
    except Exception:
        pass

    db.delete(dataset)
    db.commit()
    return {"message": f"Dataset {dataset.filename} deleted successfully"}



