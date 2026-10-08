from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.api.dependencies import get_current_user
from Backend.app.models.user import User
from Backend.app.services.visualization_service import (
    histogram_data_service,
    bar_chart_data_service,
    scatter_plot_data_service,
    heatmap_data_service,
    box_plot_data_service,
)

router = APIRouter(prefix="/visualizations", tags=["Visualizations"])


@router.get("/{dataset_id}/histogram")
def get_histogram_data(
    dataset_id: int,
    column: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return histogram_data_service(
        dataset_id=dataset_id,
        column=column,
        user_id=current_user.id,
        db=db
    )


@router.get("/{dataset_id}/bar")
def get_bar_chart_data(
    dataset_id: int,
    column: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return bar_chart_data_service(
        dataset_id=dataset_id,
        column=column,
        user_id=current_user.id,
        db=db
    )


@router.get("/{dataset_id}/scatter")
def get_scatter_plot_data(
    dataset_id: int,
    x_column: str,
    y_column: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return scatter_plot_data_service(
        dataset_id=dataset_id,
        x_column=x_column,
        y_column=y_column,
        user_id=current_user.id,
        db=db
    )


@router.get("/{dataset_id}/heatmap")
def get_heatmap_data(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return heatmap_data_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/{dataset_id}/boxplot")
def get_box_plot_data(
    dataset_id: int,
    column: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return box_plot_data_service(
        dataset_id=dataset_id,
        column=column,
        user_id=current_user.id,
        db=db
    )