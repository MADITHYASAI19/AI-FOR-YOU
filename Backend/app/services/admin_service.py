import os
from fastapi import HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.user import User
from Backend.app.models.dataset import Dataset
from Backend.app.models.ml_model import MLModel
from Backend.app.models.predictions import Prediction
from Backend.app.models.job import Job


def get_admin_dashboard_service(db: Session):
    return {
        "total_users": db.query(User).count(),
        "total_datasets": db.query(Dataset).count(),
        "total_models": db.query(MLModel).count(),
        "total_predictions": db.query(Prediction).count(),
        "total_jobs": db.query(Job).count(),
        "running_jobs": db.query(Job).filter(Job.status == "running").count(),
        "failed_jobs": db.query(Job).filter(Job.status == "failed").count(),
        "completed_jobs": db.query(Job).filter(Job.status == "completed").count(),
    }


def list_all_users_service(db: Session):
    return db.query(User).order_by(User.created_at.desc()).all()


def get_user_by_id_service(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def update_user_role_service(user_id: int, role: str, db: Session):
    if role not in ["user", "admin"]:
        raise HTTPException(
            status_code=400,
            detail="Role must be either user or admin"
        )

    user = get_user_by_id_service(user_id, db)

    user.role = role

    db.commit()
    db.refresh(user)

    return user


def delete_user_service(user_id: int, db: Session):
    user = get_user_by_id_service(user_id, db)

    db.delete(user)
    db.commit()

    return {
        "message": "User deleted successfully",
        "user_id": user_id
    }


def list_all_datasets_service(db: Session):
    return db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()


def delete_dataset_admin_service(dataset_id: int, db: Session):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset.stored_path and os.path.exists(dataset.stored_path):
        os.remove(dataset.stored_path)

    db.delete(dataset)
    db.commit()

    return {
        "message": "Dataset deleted successfully",
        "dataset_id": dataset_id
    }


def list_all_models_service(db: Session):
    return db.query(MLModel).order_by(MLModel.created_at.desc()).all()


def delete_model_admin_service(model_id: int, db: Session):
    model = db.query(MLModel).filter(MLModel.id == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    if model.model_path and os.path.exists(model.model_path):
        os.remove(model.model_path)

    db.delete(model)
    db.commit()

    return {
        "message": "Model deleted successfully",
        "model_id": model_id
    }


def list_all_jobs_service(db: Session):
    return db.query(Job).order_by(Job.created_at.desc()).all()


def list_failed_jobs_service(db: Session):
    return (
        db.query(Job)
        .filter(Job.status == "failed")
        .order_by(Job.created_at.desc())
        .all()
    )