from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.api.dependencies import get_current_user
from Backend.app.models.user import User
from Backend.app.services.preprocessing_service import (
    remove_missing_values_service,
    remove_duplicates_service,
    auto_clean_service,
)

router = APIRouter(prefix="/preprocessing", tags=["Preprocessing"])


@router.post("/{dataset_id}/remove-missing")
def remove_missing_values(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return remove_missing_values_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.post("/{dataset_id}/remove-duplicates")
def remove_duplicates(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return remove_duplicates_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.post("/{dataset_id}/auto-clean")
def auto_clean(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return auto_clean_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )