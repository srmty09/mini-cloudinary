import re
import uuid
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")


class UserCredentials(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v):
        v = v.strip().lower()
        if not v:
            raise ValueError("Username cannot be empty")
        return v


class UserRegistration(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        v = v.strip().lower()
        if not (3 <= len(v) <= 32):
            raise ValueError("Username must be 3-32 characters")
        if not USERNAME_PATTERN.match(v):
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 characters")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    storage_key: str
    content_type: str
    size: int
    width: Optional[int] = None
    height: Optional[int] = None
    original_filename: str
    created_at: datetime


class ImageList(BaseModel):
    items: List[ImageOut]
    page: int
    limit: int
    total: int


class ResizeParams(BaseModel):
    width: Optional[int] = Field(None, ge=1, le=10000)
    height: Optional[int] = Field(None, ge=1, le=10000)


class CropParams(BaseModel):
    width: int = Field(..., ge=1, le=10000)
    height: int = Field(..., ge=1, le=10000)
    x: int = Field(0, ge=0, le=100000)
    y: int = Field(0, ge=0, le=100000)


class TransformRequest(BaseModel):
    resize: Optional[ResizeParams] = None
    crop: Optional[CropParams] = None
    rotate: Optional[float] = Field(None, ge=-360, le=360)
    flip: bool = False
    mirror: bool = False
    grayscale: bool = False
    sepia: bool = False
    invert: bool = False
    brightness: Optional[float] = Field(None, ge=0, le=500)
    contrast: Optional[float] = Field(None, ge=0, le=500)
    saturation: Optional[float] = Field(None, ge=0, le=500)
    blur: Optional[float] = Field(None, ge=0, le=100)
    sharpen: bool = False
    format: Optional[Literal["jpeg", "png", "webp"]] = None
    compress_quality: Optional[int] = Field(None, ge=1, le=100)


class TransformOut(BaseModel):
    id: uuid.UUID
    image_id: uuid.UUID
    storage_key: str
    size: int
    transform_params: dict
    created_at: datetime
    url: str
