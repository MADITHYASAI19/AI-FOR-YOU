from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from Backend.app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)

    job_type = Column(String, nullable=False)

    status = Column(String, default="pending")

    progress = Column(Integer, default=0)

    message = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )