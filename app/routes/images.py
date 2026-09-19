import io
import json
import hashlib
import uuid
from PIL import Image
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, storage
from app.auth import get_current_user
from app.transforms import apply_transforms, format_for_content_type, FORMAT_EXT, FORMAT_CONTENT_TYPE

router = APIRouter()

MAX_UPLOAD_SIZE = 10 * 1024 * 1024


@router.post("/images", response_model=schemas.ImageOut)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    data = await file.read()
    if len(data) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 10 MB)")

    try:
        probe = Image.open(io.BytesIO(data))
        detected_format = (probe.format or "").lower()
        probe.verify()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is not a valid image")

    if detected_format not in FORMAT_EXT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported image format: {detected_format}")

    image_id = uuid.uuid4()
    ext = FORMAT_EXT[detected_format]
    content_type = FORMAT_CONTENT_TYPE[detected_format]
    storage_key = f"originals/{user.id}/{image_id}.{ext}"

    storage.upload_file(storage_key, data, content_type)

    image = models.Image(
        id=image_id,
        user_id=user.id,
        storage_key=storage_key,
        content_type=content_type,
        size=len(data),
        original_filename=file.filename,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete("/images/{image_id}")
def delete_image(
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    image = db.query(models.Image).filter(models.Image.id == image_id, models.Image.user_id == user.id).first()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    transforms = db.query(models.ImageTransform).filter(models.ImageTransform.image_id == image_id).all()
    for transform in transforms:
        storage.delete_file(transform.storage_key)
        db.delete(transform)
    db.flush()

    storage.delete_file(image.storage_key)
    db.delete(image)
    db.commit()
    return {"detail": "deleted"}


@router.get("/images", response_model=schemas.ImageList)
def list_images(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    query = db.query(models.Image).filter(models.Image.user_id == user.id).order_by(models.Image.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    return {"items": items, "page": page, "limit": limit, "total": total}


@router.get("/images/{image_id}")
def get_image(
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    image = db.query(models.Image).filter(models.Image.id == image_id, models.Image.user_id == user.id).first()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    data = storage.get_file(image.storage_key)
    return StreamingResponse(io.BytesIO(data), media_type=image.content_type)


@router.post("/images/{image_id}/transform", response_model=schemas.TransformOut)
def transform_image(
    image_id: uuid.UUID,
    payload: schemas.TransformRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    image = db.query(models.Image).filter(models.Image.id == image_id, models.Image.user_id == user.id).first()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    params = payload.model_dump(exclude_none=True)
    params_hash = hashlib.sha256(json.dumps(params, sort_keys=True).encode()).hexdigest()[:16]

    default_format = format_for_content_type(image.content_type)
    output_format = (payload.format or default_format).lower()
    out_ext = FORMAT_EXT.get(output_format, "jpg")
    derived_key = f"derived/{user.id}/{image_id}/{params_hash}.{out_ext}"

    transform = (
        db.query(models.ImageTransform)
        .filter(models.ImageTransform.image_id == image_id, models.ImageTransform.storage_key == derived_key)
        .first()
    )

    if transform is None:
        if not storage.file_exists(derived_key):
            original_bytes = storage.get_file(image.storage_key)
            result_bytes, content_type = apply_transforms(original_bytes, payload, output_format)
            storage.upload_file(derived_key, result_bytes, content_type)

        transform = models.ImageTransform(image_id=image_id, storage_key=derived_key, transform_params=params)
        db.add(transform)
        db.commit()
        db.refresh(transform)

    return schemas.TransformOut(
        id=transform.id,
        image_id=transform.image_id,
        storage_key=transform.storage_key,
        transform_params=transform.transform_params,
        created_at=transform.created_at,
        url=f"/images/{image_id}/transforms/{transform.id}",
    )


@router.get("/images/{image_id}/transforms/{transform_id}")
def get_transformed_image(
    image_id: uuid.UUID,
    transform_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    image = db.query(models.Image).filter(models.Image.id == image_id, models.Image.user_id == user.id).first()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    transform = (
        db.query(models.ImageTransform)
        .filter(models.ImageTransform.id == transform_id, models.ImageTransform.image_id == image_id)
        .first()
    )
    if not transform:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transform not found")

    ext = transform.storage_key.rsplit(".", 1)[-1]
    content_type = "image/jpeg" if ext == "jpg" else f"image/{ext}"
    data = storage.get_file(transform.storage_key)
    return StreamingResponse(io.BytesIO(data), media_type=content_type)
