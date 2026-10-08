from typing import List
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.api.dependencies import get_current_user
from Backend.app.models.user import User
from Backend.app.schemas.model_management import ModelManagementResponse, ModelDetailsResponse
from Backend.app.services.model_management_service import (
    list_user_models_service,
    list_models_by_dataset_service,
    get_model_details_service,
    get_model_details_with_api_info_service,
    delete_model_service,
    get_best_model_service,
    get_model_file_for_download_service,
)

router = APIRouter(prefix="/models", tags=["Model Management"])


@router.get("/", response_model=List[ModelManagementResponse])
def list_my_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return list_user_models_service(
        user_id=current_user.id,
        db=db
    )


@router.get("/dataset/{dataset_id}", response_model=List[ModelManagementResponse])
def list_models_by_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return list_models_by_dataset_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/best", response_model=ModelManagementResponse)
def get_best_model(
    dataset_id: int,
    problem_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_best_model_service(
        dataset_id=dataset_id,
        problem_type=problem_type,
        user_id=current_user.id,
        db=db
    )


@router.get("/{model_id}", response_model=ModelDetailsResponse)
def get_model_details(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_model_details_with_api_info_service(
        model_id=model_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/{model_id}/download")
def download_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_path, filename = get_model_file_for_download_service(
        model_id=model_id, user_id=current_user.id, db=db
    )
    return FileResponse(path=file_path, filename=filename, media_type="application/octet-stream")


@router.delete("/{model_id}")
def delete_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return delete_model_service(
        model_id=model_id,
        user_id=current_user.id,
        db=db
    )