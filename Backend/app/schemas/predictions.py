from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime


class SinglePredictionRequest(BaseModel):
    input_data: Dict[str, Any]


class BatchPredictionRequest(BaseModel):
    input_data: List[Dict[str, Any]]


class PredictionInputSchemaResponse(BaseModel):
    model_id: int
    model_name: str
    problem_type: str
    target_column: str
    required_input_columns: List[str]
    message: str


class PredictionResponse(BaseModel):
    model_id: int
    model_name: str
    prediction: Any
    confidence_score: Optional[float] = None


class BatchPredictionResponse(BaseModel):
    model_id: int
    model_name: str
    total_records: int
    predictions_generated: int
    results: List[Dict[str, Any]]


class PredictionHistoryResponse(BaseModel):
    id: int
    user_id: int
    model_id: int
    input_data: Any
    prediction_result: Any
    confidence_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True