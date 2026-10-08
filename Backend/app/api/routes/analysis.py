from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from Backend.app.api.dependencies import get_current_user
from Backend.app.models.user import User


from Backend.app.core.database import get_db
from Backend.app.services.analysis_service import (
    generate_summary_service,
    correlation_analysis_service,
    dataset_insights_service,
    distribution_analysis_service,
)

router = APIRouter(prefix="/analysis", tags=["Automated EDA"])


@router.get("/{dataset_id}/summary")
def generate_summary(dataset_id: int, db: Session = Depends(get_db),
    current_user: User=Depends(get_current_user)
):

    return generate_summary_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/{dataset_id}/correlation")
def analyze_correlation(dataset_id: int, db: Session = Depends(get_db),
    current_user: User=Depends(get_current_user) 
):

    return correlation_analysis_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/{dataset_id}/insights")
def inspect_dataset_insights(dataset_id: int, db: Session = Depends(get_db),
    current_user: User=Depends(get_current_user)
):

    return dataset_insights_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/{dataset_id}/distribution")
def understand_distribution(dataset_id: int, db: Session = Depends(get_db),
    current_user:User=Depends(get_current_user)
):

    return distribution_analysis_service(
        dataset_id=dataset_id,
        user_id=current_user.id,
        db=db
    )