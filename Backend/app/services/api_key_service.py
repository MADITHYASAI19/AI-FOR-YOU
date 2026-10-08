import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.user import User
from Backend.app.models.api_key import ApiKey
from Backend.app.core.security import hash_password

DEMO_KEY_LIFETIME_HOURS = 24


def generate_demo_api_key_service(db: Session):
    """Create a throwaway demo user plus a 24-hour API key tied to it, so
    someone trying out the project (e.g. a recruiter) can hit the real API
    without registering an account, and without their test data mixing
    with any real user's data."""
    unique_suffix = uuid.uuid4().hex[:12]

    demo_user = User(
        username=f"demo_{unique_suffix}",
        email=f"demo_{unique_suffix}@demo.fullaiml.local",
        age=18,
        role="demo",
        hashed_password=hash_password(secrets.token_urlsafe(24)),
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)

    raw_key = f"demo_{secrets.token_urlsafe(32)}"
    expires_at = datetime.utcnow() + timedelta(hours=DEMO_KEY_LIFETIME_HOURS)

    api_key = ApiKey(
        key=raw_key,
        user_id=demo_user.id,
        expires_at=expires_at,
    )
    db.add(api_key)
    db.commit()

    return {
        "api_key": raw_key,
        "expires_at": expires_at,
        "expires_in_hours": DEMO_KEY_LIFETIME_HOURS,
        "usage": "Send it as the 'X-API-Key' header on any request instead of an Authorization bearer token.",
    }


def resolve_user_from_api_key(key: str, db: Session):
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.key == key, ApiKey.revoked == False)  # noqa: E712
        .first()
    )

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if api_key.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="API key has expired")

    user = db.query(User).filter(User.id == api_key.user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="API key user not found")

    return user
