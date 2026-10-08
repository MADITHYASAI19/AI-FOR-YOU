import os
import uuid
import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.dataset import Dataset
from Backend.app.utils.csv_utils import read_csv_safely

CLEANED_DIR = "storage/cleaned"
os.makedirs(CLEANED_DIR, exist_ok=True)


def get_dataset_or_404(dataset_id: int, user_id: int, db: Session):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == user_id
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return dataset


def save_cleaned_file(df, original_filename: str):
    cleaned_filename = f"cleaned_{uuid.uuid4()}_{original_filename}"
    cleaned_path = os.path.join(CLEANED_DIR, cleaned_filename)

    df.to_csv(cleaned_path, index=False)

    return cleaned_path


def remove_missing_values_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)

    df = read_csv_safely(dataset.stored_path)

    original_rows = df.shape[0]
    cleaned_df = df.dropna()
    cleaned_rows = cleaned_df.shape[0]

    cleaned_path = save_cleaned_file(cleaned_df, dataset.filename)

    return {
        "message": "Missing values removed successfully",
        "original_rows": original_rows,
        "cleaned_rows": cleaned_rows,
        "removed_rows": original_rows - cleaned_rows,
        "cleaned_file_path": cleaned_path
    }


def remove_duplicates_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)

    df = read_csv_safely(dataset.stored_path)

    original_rows = df.shape[0]
    cleaned_df = df.drop_duplicates()
    cleaned_rows = cleaned_df.shape[0]

    cleaned_path = save_cleaned_file(cleaned_df, dataset.filename)

    return {
        "message": "Duplicate rows removed successfully",
        "original_rows": original_rows,
        "cleaned_rows": cleaned_rows,
        "removed_rows": original_rows - cleaned_rows,
        "cleaned_file_path": cleaned_path
    }


def auto_clean_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)

    df = read_csv_safely(dataset.stored_path)

    original_rows = df.shape[0]

    cleaned_df = df.drop_duplicates()
    after_duplicates = cleaned_df.shape[0]

    cleaned_df = cleaned_df.dropna()
    cleaned_rows = cleaned_df.shape[0]

    cleaned_path = save_cleaned_file(cleaned_df, dataset.filename)

    return {
        "message": "Dataset auto-cleaned successfully",
        "original_rows": original_rows,
        "after_duplicates_removed": after_duplicates,
        "cleaned_rows": cleaned_rows,
        "total_removed_rows": original_rows - cleaned_rows,
        "cleaned_file_path": cleaned_path
    }