import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.dataset import Dataset
from Backend.app.services.dataset_service import read_csv_safely

def get_dataset_or_404(dataset_id: int, user_id: int, db: Session):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == user_id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return dataset


def load_dataframe(dataset: Dataset):
    try:
        return read_csv_safely(dataset.stored_path)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read dataset: {str(e)}"
        )


def histogram_data_service(dataset_id: int, column: str, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataframe(dataset)

    if column not in df.columns:
        raise HTTPException(status_code=400, detail="Column not found")

    if not pd.api.types.is_numeric_dtype(df[column]):
        raise HTTPException(status_code=400, detail="Histogram requires numeric column")

    counts = pd.cut(df[column].dropna(), bins=10).value_counts().sort_index()

    return {
        "chart_type": "histogram",
        "dataset_id": dataset.id,
        "column": column,
        "data": [
            {
                "bin": str(interval),
                "count": int(count)
            }
            for interval, count in counts.items()
        ]
    }


def bar_chart_data_service(dataset_id: int, column: str, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataframe(dataset)

    if column not in df.columns:
        raise HTTPException(status_code=400, detail="Column not found")

    value_counts = df[column].dropna().value_counts().head(10)

    return {
        "chart_type": "bar",
        "dataset_id": dataset.id,
        "column": column,
        "data": [
            {
                "label": str(label),
                "count": int(count)
            }
            for label, count in value_counts.items()
        ]
    }


def scatter_plot_data_service(
    dataset_id: int,
    x_column: str,
    y_column: str,
    user_id: int,
    db: Session
):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataframe(dataset)

    if x_column not in df.columns or y_column not in df.columns:
        raise HTTPException(status_code=400, detail="Column not found")

    if not pd.api.types.is_numeric_dtype(df[x_column]):
        raise HTTPException(status_code=400, detail="x_column must be numeric")

    if not pd.api.types.is_numeric_dtype(df[y_column]):
        raise HTTPException(status_code=400, detail="y_column must be numeric")

    clean_df = df[[x_column, y_column]].dropna().head(1000)

    return {
        "chart_type": "scatter",
        "dataset_id": dataset.id,
        "x_column": x_column,
        "y_column": y_column,
        "data": [
            {
                "x": float(row[x_column]),
                "y": float(row[y_column])
            }
            for _, row in clean_df.iterrows()
        ]
    }


def heatmap_data_service(dataset_id: int, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataframe(dataset)

    numeric_df = df.select_dtypes(include=["number"])

    if numeric_df.empty:
        raise HTTPException(
            status_code=400,
            detail="No numeric columns available for heatmap"
        )

    corr = numeric_df.corr().fillna(0)

    data = []

    for row_column in corr.index:
        for col_column in corr.columns:
            data.append({
                "x": col_column,
                "y": row_column,
                "value": round(float(corr.loc[row_column, col_column]), 4)
            })

    return {
        "chart_type": "heatmap",
        "dataset_id": dataset.id,
        "columns": corr.columns.tolist(),
        "data": data
    }


def box_plot_data_service(dataset_id: int, column: str, user_id: int, db: Session):
    dataset = get_dataset_or_404(dataset_id, user_id, db)
    df = load_dataframe(dataset)

    if column not in df.columns:
        raise HTTPException(status_code=400, detail="Column not found")

    if not pd.api.types.is_numeric_dtype(df[column]):
        raise HTTPException(status_code=400, detail="Box plot requires numeric column")

    series = df[column].dropna()

    return {
        "chart_type": "boxplot",
        "dataset_id": dataset.id,
        "column": column,
        "data": {
            "min": float(series.min()),
            "q1": float(series.quantile(0.25)),
            "median": float(series.median()),
            "q3": float(series.quantile(0.75)),
            "max": float(series.max()),
            "mean": float(series.mean())
        }
    }