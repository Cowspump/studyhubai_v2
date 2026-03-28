#!/usr/bin/env python3
"""
Test script for photo upload endpoint
Usage: python test_photo_upload.py <teacher_token> <image_path>
"""

import sys
import aiohttp
import asyncio
from pathlib import Path

API_BASE_URL = "http://localhost:4000"

async def test_upload(token: str, image_path: str):
    """Test uploading a photo"""
    file_path = Path(image_path)
    
    if not file_path.exists():
        print(f"Error: File '{image_path}' not found")
        return False
    
    # Check file size
    file_size = file_path.stat().st_size
    max_size = 5 * 1024 * 1024  # 5MB
    if file_size > max_size:
        print(f"Error: File size ({file_size} bytes) exceeds maximum ({max_size} bytes)")
        return False
    
    # Check file type - extended format support
    valid_types = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic', '.heif'}
    if file_path.suffix.lower() not in valid_types:
        print(f"Error: Invalid file type. Allowed: {', '.join(sorted(valid_types))}")
        return False
    
    async with aiohttp.ClientSession() as session:
        with open(file_path, 'rb') as f:
            data = aiohttp.FormData()
            data.add_field('file', f, filename=file_path.name)
            
            headers = {
                'Authorization': f'Bearer {token}'
            }
            
            try:
                async with session.post(
                    f"{API_BASE_URL}/api/teacher/me/photo",
                    data=data,
                    headers=headers
                ) as resp:
                    result = await resp.json()
                    
                    if resp.status == 200:
                        photo_url = result.get('photo')
                        full_url = f"{API_BASE_URL}{photo_url}" if photo_url else "N/A"
                        print(f"✓ Success! Photo uploaded")
                        print(f"  Relative path: {photo_url}")
                        print(f"  Full URL: {full_url}")
                        return True
                    else:
                        print(f"✗ Error: {resp.status}")
                        print(f"  Detail: {result.get('detail', 'Unknown error')}")
                        return False
            except Exception as e:
                print(f"✗ Error: {e}")
                return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_photo_upload.py <token> <image_path>")
        print("")
        print("Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC")
        print("Max file size: 5MB")
        print("")
        print("Example: python test_photo_upload.py eyJhbGc... ./test_image.jpg")
        sys.exit(1)
    
    token = sys.argv[1]
    image_path = sys.argv[2]
    
    result = asyncio.run(test_upload(token, image_path))
    sys.exit(0 if result else 1)

