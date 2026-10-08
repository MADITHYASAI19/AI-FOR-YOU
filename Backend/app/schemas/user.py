from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    age: int
    role: Optional[str] = "user"

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")

        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")

        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter")

        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValueError("Password must contain at least one special character")

        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    token: str


class UserProfileUpdate(BaseModel):
    age: Optional[int] = None
    role: Optional[str] = None
    profile_picture: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    age: Optional[int] = None
    role: Optional[str] = None
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new_user: Optional[bool] = False
    is_profile_incomplete: Optional[bool] = False