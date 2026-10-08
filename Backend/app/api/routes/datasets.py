from typing import List
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.models.user import User
from Backend.app.api.dependencies import get_current_user
from Backend.app.schemas.dataset import DatasetResponse
from Backend.app.services.dataset_service import (
    upload_dataset_service,
    list_datasets_service,
    get_dataset_service,
    delete_dataset_service,
)

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/upload", response_model=DatasetResponse)
def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return upload_dataset_service(
        file=file,
        user_id=current_user.id,
        db=db
    )


@router.get("/", response_model=List[DatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return list_datasets_service(
        user_id=current_user.id,
        db=db
    )


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_dataset_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return delete_dataset_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )