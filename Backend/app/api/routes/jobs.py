from typing import List
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.api.dependencies import get_current_user
from Backend.app.models.user import User
from Backend.app.schemas.job import JobResponse
from Backend.app.schemas.ml_model import TrainModelRequest
from Backend.app.services.job_service import (
    create_job_service,
    get_job_service,
    list_jobs_service,
)
from Backend.app.services.background_job_service import run_training_job


router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/train-model", response_model=JobResponse)
def create_training_job(
    request: TrainModelRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = create_job_service(
        user_id=current_user.id,
        dataset_id=request.dataset_id,
        job_type="model_training",
        db=db
    )

    background_tasks.add_task(
        run_training_job,
        job.id,
        request.model_dump(),
        current_user.id
    )

    return job


@router.get("/", response_model=List[JobResponse])
def list_my_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return list_jobs_service(
        user_id=current_user.id,
        db=db
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_job_service(
        job_id=job_id,
        user_id=current_user.id,
        db=db
    )