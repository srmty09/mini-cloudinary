import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class UserCredentials(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    storage_key: str
    content_type: str
    size: int
    original_filename: str
    created_at: datetime


class ImageList(BaseModel):
    items: List[ImageOut]
    page: int
    limit: int
    total: int


class ResizeParams(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None


class CropParams(BaseModel):
    width: int
    height: int
    x: int = 0
    y: int = 0


class TransformRequest(BaseModel):
    resize: Optional[ResizeParams] = None
    crop: Optional[CropParams] = None
    rotate: Optional[float] = None
    flip: bool = False
    mirror: bool = False
    grayscale: bool = False
    sepia: bool = False
    format: Optional[str] = None
    compress_quality: Optional[int] = None


class TransformOut(BaseModel):
    id: uuid.UUID
    image_id: uuid.UUID
    storage_key: str
    transform_params: dict
    created_at: datetime
    url: str
