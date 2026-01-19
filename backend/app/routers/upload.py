import json
import os
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Document
from ..schemas import DocumentOut
from ..services import pdf_service


router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/", response_model=DocumentOut)
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

    base_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    dirs = pdf_service.ensure_dirs(os.path.abspath(base_dir))
    content = await file.read()
    stored_path = pdf_service.save_upload(file.filename, content, dirs["uploads"])

    metadata = pdf_service.extract_metadata(stored_path)
    document = Document(
        filename=file.filename,
        stored_path=stored_path,
        page_count=metadata.get("page_count", 0),
        metadata_json=json.dumps(metadata),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return DocumentOut(
        id=document.id,
        filename=document.filename,
        stored_path=document.stored_path,
        uploaded_at=document.uploaded_at,
        page_count=document.page_count,
        metadata=metadata,
    )
