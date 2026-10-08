import os
import pandas as pd
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.dataset import Dataset
from Backend.app.utils.file_utils import save_upload_file
from Backend.app.utils.csv_utils import read_csv_safely


from Backend.app.models.ml_model import MLModel
from Backend.app.models.predictions import Prediction
from Backend.app.models.job import Job
from Backend.app.utils.file_utils import delete_file_if_exists

def upload_dataset_service(file: UploadFile, user_id: int, db: Session):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    stored_filename, stored_path, file_size = save_upload_file(file)

    try:
        df = read_csv_safely(stored_path)

        new_dataset = Dataset(
            user_id=user_id,
            filename=file.filename,
            stored_path=stored_path,
            file_size=file_size,
            rows_count=df.shape[0],
            columns_count=df.shape[1],
        )

        db.add(new_dataset)
        db.commit()
        db.refresh(new_dataset)

        return new_dataset

    except HTTPException:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise


def list_datasets_service(user_id: int, db: Session):
    return db.query(Dataset).filter(Dataset.user_id == user_id).all()


def get_dataset_service(dataset_id: int, user_id: int, db: Session):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == user_id,
        )
        .first()
    )

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return dataset


def delete_dataset_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_service(dataset_id, user_id, db)

    trained_models = (
        db.query(MLModel)
        .filter(MLModel.dataset_id == dataset.id)
        .all()
    )

    for model in trained_models:
        delete_file_if_exists(model.model_path)

    model_ids = [model.id for model in trained_models]

    if model_ids:
        db.query(Prediction).filter(
            Prediction.model_id.in_(model_ids)
        ).delete(synchronize_session=False)

    deleted_models = (
        db.query(MLModel)
        .filter(MLModel.dataset_id == dataset.id)
        .delete(synchronize_session=False)
    )

    db.query(Job).filter(
        Job.dataset_id == dataset.id
    ).delete(synchronize_session=False)

    delete_file_if_exists(dataset.stored_path)

    db.delete(dataset)
    db.commit()

    return {
        "message": "Dataset and related resources deleted successfully",
        "dataset_id": dataset_id,
        "deleted_models": deleted_models,
    }