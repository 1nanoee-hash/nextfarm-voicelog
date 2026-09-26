from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
    status,
)


router = APIRouter(
    prefix="/api/uploads",
    tags=["Uploads"],
)


UPLOAD_ROOT = Path("uploads")
IMAGE_UPLOAD_DIR = UPLOAD_ROOT / "images"

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_IMAGE_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.post(
    "/images",
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    file: UploadFile = File(...),
) -> dict[str, str | bool]:
    content_type = (
        file.content_type or ""
    ).lower()

    extension = ALLOWED_IMAGE_TYPES.get(
        content_type
    )

    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "code": "UNSUPPORTED_IMAGE_TYPE",
                "message": (
                    "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP."
                ),
            },
        )

    content = await file.read(
        MAX_IMAGE_SIZE_BYTES + 1
    )

    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "IMAGE_TOO_LARGE",
                "message": (
                    "Ảnh vượt quá giới hạn 10 MB."
                ),
            },
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMPTY_IMAGE",
                "message": "Tệp ảnh rỗng.",
            },
        )

    IMAGE_UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_filename = (
        f"{uuid4().hex}{extension}"
    )

    stored_path = (
        IMAGE_UPLOAD_DIR
        / stored_filename
    )

    stored_path.write_bytes(
        content
    )

    photo_path = (
        f"/uploads/images/{stored_filename}"
    )

    return {
        "success": True,
        "photo": photo_path,
    }