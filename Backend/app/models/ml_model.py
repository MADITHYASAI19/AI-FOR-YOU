from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from datetime import datetime

from Backend.app.core.database import Base


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    model_name = Column(String, nullable=False)

    algorithm = Column(String, nullable=False)

    problem_type = Column(String, nullable=False)

    target_column = Column(String, nullable=False)

    model_path = Column(String, nullable=False)

    metrics = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)