from sqlalchemy import func
from fastapi import HTTPException, status
from app import models

MAX_STORAGE_BYTES = 500 * 1024 * 1024


def user_storage_used(db, user_id):
    images_total = (
        db.query(func.coalesce(func.sum(models.Image.size), 0)).filter(models.Image.user_id == user_id).scalar()
    )
    transforms_total = (
        db.query(func.coalesce(func.sum(models.ImageTransform.size), 0))
        .join(models.Image, models.ImageTransform.image_id == models.Image.id)
        .filter(models.Image.user_id == user_id)
        .scalar()
    )
    return images_total + transforms_total


def check_storage_quota(db, user_id, additional_bytes):
    used = user_storage_used(db, user_id)
    if used + additional_bytes > MAX_STORAGE_BYTES:
        limit_mb = MAX_STORAGE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Storage limit exceeded ({limit_mb} MB per account) — delete some images to free up space",
        )
