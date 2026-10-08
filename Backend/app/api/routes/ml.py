from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.schemas.ml_model import TrainModelRequest
from Backend.app.services.ml_service import (
    train_model_service,
    compare_classification_models_service,
    compare_regression_models_service,
    get_available_algorithms_service,
)
from Backend.app.api.dependencies import get_current_user
from Backend.app.models.user import User


router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.get("/algorithms")
def get_available_algorithms(
    problem_type: str,
    current_user: User = Depends(get_current_user)
):
    return get_available_algorithms_service(problem_type=problem_type)


@router.post("/train")
def train_model(
    request: TrainModelRequest,
    db: Session = Depends(get_db),
    current_user: User=Depends(get_current_user)
):

    return train_model_service(
        request=request,
        user_id=current_user.id,
        db=db
    )
@router.get("/compare/classification")
def compare_classification_models(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return compare_classification_models_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/compare/regression")
def compare_regression_models(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return compare_regression_models_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )