from pydantic import BaseModel
from typing import Any, Optional, Dict
from datetime import datetime


class ModelManagementResponse(BaseModel):
    id: int
    user_id: int
    dataset_id: int
    model_name: str
    algorithm: str
    problem_type: str
    target_column: str
    model_path: str
    metrics: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class ModelDetailsResponse(ModelManagementResponse):
    prediction_api: Dict[str, Any]