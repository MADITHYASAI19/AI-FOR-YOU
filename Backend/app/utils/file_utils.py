import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = "storage/uploads"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def ensure_upload_dir_exists():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def validate_csv_file(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is missing")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")


def generate_unique_filename(original_filename: str) -> str:
    extension = original_filename.split(".")[-1]
    unique_name = f"{uuid.uuid4()}.{extension}"
    return unique_name


def save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    ensure_upload_dir_exists()
    validate_csv_file(file)

    stored_filename = generate_unique_filename(file.filename)
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return stored_filename, file_path, file_size


def delete_file_if_exists(file_path: str):
    if file_path and os.path.exists(file_path):
        os.remove(file_path)