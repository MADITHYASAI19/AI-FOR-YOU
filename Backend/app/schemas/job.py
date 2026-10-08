from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobResponse(BaseModel):
    id: int
    user_id: int
    dataset_id: Optional[int]
    job_type: str
    status: str
    progress: int
    message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True