from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON
from datetime import datetime

from Backend.app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    model_id = Column(Integer, ForeignKey("ml_models.id"), nullable=False)

    input_data = Column(JSON, nullable=False)

    prediction_result = Column(JSON, nullable=False)

    confidence_score = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)