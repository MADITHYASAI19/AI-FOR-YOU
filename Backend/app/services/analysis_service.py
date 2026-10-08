import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.dataset import Dataset

from Backend.app.utils.csv_utils import read_csv_safely

def get_dataset_or_404(dataset_id: int, user_id: int, db: Session):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == user_id
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return dataset


def load_dataset(dataset: Dataset):
    return read_csv_safely(dataset.stored_path)


def generate_summary_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataset(dataset)

    return {
        "dataset_id": dataset.id,
        "filename": dataset.filename,
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": df.columns.tolist(),
        "data_types": df.dtypes.astype(str).to_dict(),
        "missing_values": df.isnull().sum().astype(int).to_dict(),
        "duplicate_rows": int(df.duplicated().sum()),
        "numeric_summary": df.describe().fillna("").to_dict(),
    }


def correlation_analysis_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataset(dataset)

    numeric_df = df.select_dtypes(include=["number"])

    if numeric_df.empty:
        raise HTTPException(
            status_code=400,
            detail="No numeric columns available for correlation analysis"
        )

    correlation = numeric_df.corr().fillna(0)

    return {
        "dataset_id": dataset.id,
        "numeric_columns": numeric_df.columns.tolist(),
        "correlation_matrix": correlation.to_dict()
    }


def dataset_insights_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataset(dataset)

    total_cells = df.shape[0] * df.shape[1]
    missing_cells = int(df.isnull().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    numeric_columns = df.select_dtypes(include=["number"]).columns.tolist()
    categorical_columns = df.select_dtypes(include=["object", "category"]).columns.tolist()

    return {
        "dataset_id": dataset.id,
        "filename": dataset.filename,
        "total_rows": int(df.shape[0]),
        "total_columns": int(df.shape[1]),
        "total_cells": int(total_cells),
        "missing_cells": missing_cells,
        "missing_percentage": round((missing_cells / total_cells) * 100, 2) if total_cells else 0,
        "duplicate_rows": duplicate_rows,
        "numeric_columns_count": len(numeric_columns),
        "categorical_columns_count": len(categorical_columns),
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
    }


def distribution_analysis_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataset(dataset)

    distributions = {}

    for column in df.columns:
        if pd.api.types.is_numeric_dtype(df[column]):
            distributions[column] = {
                "type": "numeric",
                "min": float(df[column].min()) if pd.notnull(df[column].min()) else None,
                "max": float(df[column].max()) if pd.notnull(df[column].max()) else None,
                "mean": float(df[column].mean()) if pd.notnull(df[column].mean()) else None,
                "median": float(df[column].median()) if pd.notnull(df[column].median()) else None,
                "std": float(df[column].std()) if pd.notnull(df[column].std()) else None,
            }
        else:
            distributions[column] = {
                "type": "categorical",
                "unique_values": int(df[column].nunique()),
                "top_values": df[column].value_counts().head(5).to_dict()
            }

    return {
        "dataset_id": dataset.id,
        "distributions": distributions
    }