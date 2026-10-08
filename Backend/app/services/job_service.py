from fastapi import HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.job import Job


def create_job_service(
    user_id: int,
    dataset_id: int | None,
    job_type: str,
    db: Session
):
    job = Job(
        user_id=user_id,
        dataset_id=dataset_id,
        job_type=job_type,
        status="pending",
        progress=0,
        message="Job created"
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


def update_job_service(
    job_id: int,
    db: Session,
    status: str | None = None,
    progress: int | None = None,
    message: str | None = None
):
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if status is not None:
        job.status = status

    if progress is not None:
        job.progress = progress

    if message is not None:
        job.message = message

    db.commit()
    db.refresh(job)

    return job


def get_job_service(job_id: int, user_id: int, db: Session):
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.user_id == user_id
        )
        .first()
    )

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


def list_jobs_service(user_id: int, db: Session):
    return (
        db.query(Job)
        .filter(Job.user_id == user_id)
        .order_by(Job.created_at.desc())
        .all()
    )