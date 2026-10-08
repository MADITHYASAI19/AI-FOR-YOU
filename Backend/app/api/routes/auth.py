from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from Backend.app.core.database import get_db
from Backend.app.api.dependencies import get_current_user
from Backend.app.models.user import User
from Backend.app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from Backend.app.services.auth_service import (
    register_user_service,
    login_user_service,
    google_login_service,
)
from Backend.app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    GoogleAuthRequest,
)

from Backend.app.services.auth_service import (
    register_user_service,
    login_user_service,
    google_login_service,
    update_user_profile,
)
from Backend.app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    GoogleAuthRequest,
    UserProfileUpdate
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    return register_user_service(user_data=user_data, db=db)


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user_data = UserLogin(
        email=form_data.username,
        password=form_data.password
    )
    return login_user_service(user_data=user_data, db=db)

@router.post("/google-login", response_model=TokenResponse)
def google_login(
    payload: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    return google_login_service(
        token=payload.token,
        db=db
    )

@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_profile(
    update_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return update_user_profile(
        db=db,
        current_user=current_user,
        update_data=update_data.model_dump(exclude_unset=True)
    )