from Backend.app.core.database import SessionLocal
from Backend.app.schemas.ml_model import TrainModelRequest
from Backend.app.services.ml_service import train_model_service
from Backend.app.services.job_service import update_job_service


def run_training_job(
    job_id: int,
    request_data: dict,
    user_id: int
):
    db = SessionLocal()

    try:
        update_job_service(
            job_id=job_id,
            db=db,
            status="running",
            progress=10,
            message="Training job started"
        )

        request = TrainModelRequest(**request_data)

        update_job_service(
            job_id=job_id,
            db=db,
            progress=30,
            message="Dataset loading and preprocessing started"
        )

        result = train_model_service(
            request=request,
            user_id=user_id,
            db=db
        )

        update_job_service(
            job_id=job_id,
            db=db,
            status="completed",
            progress=100,
            message=f"Model trained successfully. Model ID: {result['model_id']}"
        )

    except Exception as e:
        update_job_service(
            job_id=job_id,
            db=db,
            status="failed",
            progress=100,
            message=str(e)
        )

    finally:
        db.close()