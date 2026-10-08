from pydantic import BaseModel
from datetime import datetime


class DatasetResponse(BaseModel):
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