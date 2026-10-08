from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.api.dependencies import get_current_admin
from Backend.app.models.user import User
from Backend.app.schemas.admin import (
    AdminUserResponse,
    UpdateUserRoleRequest,
    AdminDashboardResponse,
    AdminDatasetResponse,
    AdminModelResponse,
)
from Backend.app.schemas.job import JobResponse
from Backend.app.services.admin_service import (
    get_admin_dashboard_service,
    list_all_users_service,
    get_user_by_id_service,
    update_user_role_service,
    delete_user_service,
    list_all_datasets_service,
    delete_dataset_admin_service,
    list_all_models_service,
    delete_model_admin_service,
    list_all_jobs_service,
    list_failed_jobs_service,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def admin_dashboard(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return get_admin_dashboard_service(db=db)


@router.get("/users", response_model=List[AdminUserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return list_all_users_service(db=db)


@router.get("/users/{user_id}", response_model=AdminUserResponse)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return get_user_by_id_service(
        user_id=user_id,
        db=db
    )


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
def update_user_role(
    user_id: int,
    request: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return update_user_role_service(
        user_id=user_id,
        role=request.role,
        db=db
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return delete_user_service(
        user_id=user_id,
        db=db
    )


@router.get("/datasets", response_model=List[AdminDatasetResponse])
def list_all_datasets(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return list_all_datasets_service(db=db)


@router.delete("/datasets/{dataset_id}")
def delete_dataset_admin(
    dataset_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return delete_dataset_admin_service(
        dataset_id=dataset_id,
        db=db
    )


@router.get("/models", response_model=List[AdminModelResponse])
def list_all_models(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return list_all_models_service(db=db)


@router.delete("/models/{model_id}")
def delete_model_admin(
    model_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return delete_model_admin_service(
        model_id=model_id,
        db=db
    )


@router.get("/jobs", response_model=List[JobResponse])
def list_all_jobs(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return list_all_jobs_service(db=db)


@router.get("/jobs/failed", response_model=List[JobResponse])
def list_failed_jobs(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    return list_failed_jobs_service(db=db)