from pydantic import BaseModel
from typing import Optional, Dict, Any


class TrainModelRequest(BaseModel):
    dataset_id: int
    model_name: str
    algorithm: str
    problem_type: str
    target_column: str
    test_size: Optional[float] = 0.2
    random_state: Optional[int] = 42
    hyperparameters: Optional[Dict[str, Any]] = {}

   
