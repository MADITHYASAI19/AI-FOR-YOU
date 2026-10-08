from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from Backend.app.core.database import Base
from sqlalchemy.orm import relationship

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    filename = Column(String, nullable=False)

    stored_path = Column(String, nullable=False)

    file_size = Column(Integer)

    rows_count = Column(Integer)

    columns_count = Column(Integer)

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    owner=relationship("User",back_populates="datasets")