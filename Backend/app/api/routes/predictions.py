from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.api.dependencies import get_current_user
from Backend.app.models.user import User
from Backend.app.schemas.predictions import (
    SinglePredictionRequest,
    BatchPredictionRequest,
    PredictionResponse,
    BatchPredictionResponse,
    PredictionHistoryResponse,
    PredictionInputSchemaResponse
)
from Backend.app.services.prediction_service import (
    single_prediction_service,
    batch_prediction_service,
    prediction_history_service,
    model_prediction_history_service,
    prediction_input_schema_service
)

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get("/{model_id}/input-schema")
def get_prediction_input_schema(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return prediction_input_schema_service(
        model_id=model_id,
        user_id=current_user.id,
        db=db
    )

@router.post("/{model_id}/single", response_model=PredictionResponse)
def single_prediction(
    model_id: int,
    request: SinglePredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return single_prediction_service(
        model_id=model_id,
        input_data=request.input_data,
        user_id=current_user.id,
        db=db
    )


@router.post("/{model_id}/batch", response_model=BatchPredictionResponse)
def batch_prediction(
    model_id: int,
    request: BatchPredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return batch_prediction_service(
        model_id=model_id,
        input_data=request.input_data,
        user_id=current_user.id,
        db=db
    )


@router.get("/history", response_model=List[PredictionHistoryResponse])
def get_prediction_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return prediction_history_service(
        user_id=current_user.id,
        db=db
    )


@router.get("/{model_id}/history", response_model=List[PredictionHistoryResponse])
def get_model_prediction_history(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return model_prediction_history_service(
        model_id=model_id,
        user_id=current_user.id,
        db=db
    )