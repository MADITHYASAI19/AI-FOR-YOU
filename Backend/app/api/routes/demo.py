from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.services.api_key_service import generate_demo_api_key_service

router = APIRouter(prefix="/demo", tags=["Demo Access"])


@router.post("/api-key")
def generate_demo_api_key(db: Session = Depends(get_db)):
    """Public, unauthenticated. Issues a 24-hour API key tied to a fresh,
    isolated demo account, so anyone can try the real API immediately
    without registering."""
    return generate_demo_api_key_service(db=db)
