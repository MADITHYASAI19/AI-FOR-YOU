from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime


class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    age: Optional[int] = None
    role: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateUserRoleRequest(BaseModel):
    role: str


class AdminDashboardResponse(BaseModel):
    total_users: int
    total_datasets: int
    total_models: int
    total_predictions: int
    total_jobs: int
    running_jobs: int
    failed_jobs: int
    completed_jobs: int


class AdminDatasetResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    stored_path: str
    file_size: int
    rows_count: int
    columns_count: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class AdminModelResponse(BaseModel):
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