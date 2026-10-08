import secrets
import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session


from Backend.app.models import User, Dataset
from Backend.app.schemas.user import UserCreate, UserLogin
from Backend.app.core.security import hash_password, verify_password, create_access_token
from Backend.app.core.config import settings


def register_user_service(user_data: UserCreate, db: Session):
    existing_user = (
        db.query(User)
        .filter(
            (User.email == user_data.email.lower()) |
            (User.username == user_data.username)
        )
        .first()
    )

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        username=user_data.username,
        email=user_data.email.lower(),
        age=user_data.age,
        role=user_data.role,
        hashed_password=hash_password(user_data.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

def login_user_service(user_data: UserLogin, db: Session):
    email = user_data.email.lower()

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_profile_incomplete": user.age == 0 or user.role == "user" or user.age is None
    }


def google_login_service(token: str, db: Session):
    try:
        response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )

        if response.status_code != 200:
            raise ValueError(f"Google API returned {response.status_code}")

        google_user = response.json()

    except Exception as e:
        print(f"Google token error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = google_user.get("email")
    name = google_user.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Google email not found")

    email = email.lower()

    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        access_token = create_access_token(data={"sub": str(existing_user.id)})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "is_new_user": False,
            "is_profile_incomplete": existing_user.age == 0 or existing_user.role == "user" or existing_user.age is None
        }

    username = name or email.split("@")[0]

    username_exists = db.query(User).filter(User.username == username).first()

    if username_exists:
        username = f"{username}_{secrets.token_hex(4)}"

    random_password = secrets.token_urlsafe(32)

    new_user = User(
    username=username,
    email=email,
    age=0,
    hashed_password=hash_password(random_password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": str(new_user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_new_user": True,
        "is_profile_incomplete": True
    }

def update_user_profile(db: Session, current_user: User, update_data: dict):
    if "age" in update_data and update_data["age"] is not None:
        current_user.age = update_data["age"]
    if "role" in update_data and update_data["role"] is not None:
        current_user.role = update_data["role"]
    
    db.commit()
    db.refresh(current_user)
    return current_user