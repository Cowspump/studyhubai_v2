import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from PIL import Image
from io import BytesIO

UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic', '.heif'}
ALLOWED_IMAGE_MIMES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", 
    "image/bmp", "image/tiff", "image/heic", "image/heif",
    "image/x-heic", "image/x-heif"
}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


async def save_profile_photo(file: UploadFile) -> str:
    """
    Saves a profile photo with automatic format normalization and validation.
    Converts any image format to JPEG for consistency and broad compatibility.
    
    Args:
        file: The uploaded file
        
    Returns:
        Relative path to the saved file (JPEG)
        
    Raises:
        HTTPException: If file is invalid or too large
    """
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum of {MAX_IMAGE_SIZE / 1024 / 1024:.0f}MB"
        )
    
    # Validate file extension and mime type
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    is_valid_ext = file_ext in ALLOWED_IMAGE_EXTENSIONS
    is_valid_mime = file.content_type in ALLOWED_IMAGE_MIMES
    
    if not is_valid_ext and not is_valid_mime:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Allowed types: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC"
        )
    
    # Validate image integrity and convert to JPEG
    try:
        img = Image.open(BytesIO(content))
        # Ensure RGB mode for JPEG compatibility
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = rgb_img
        
        # Convert to JPEG and save
        unique_name = f"{uuid.uuid4()}.jpg"
        file_path = UPLOAD_DIR / unique_name
        img.save(file_path, format='JPEG', quality=85, optimize=True)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file or unsupported format"
        )
    
    # Return relative path for storage in database
    return f"/uploads/{unique_name}"


ALLOWED_MATERIAL_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',
}
MAX_MATERIAL_SIZE = 15 * 1024 * 1024  # 15MB
MATERIALS_DIR = UPLOAD_DIR / "materials"
MATERIALS_DIR.mkdir(exist_ok=True)


async def save_material_file(file: UploadFile) -> str:
    content = await file.read()

    if len(content) > MAX_MATERIAL_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum of {MAX_MATERIAL_SIZE / 1024 / 1024:.0f}MB"
        )

    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in ALLOWED_MATERIAL_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed"
        )

    unique_name = f"{uuid.uuid4()}{file_ext}"
    file_path = MATERIALS_DIR / unique_name
    file_path.write_bytes(content)

    return f"/uploads/materials/{unique_name}"


async def delete_profile_photo(photo_path: str) -> None:
    """
    Deletes a profile photo if it exists.
    
    Args:
        photo_path: The relative path to the photo
    """
    if not photo_path or not photo_path.startswith("/uploads/"):
        return
    
    file_path = UPLOAD_DIR / Path(photo_path).name
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception:
            pass  # Silently ignore errors

