import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Document, ProcessRun
from ..schemas import DocumentOut, DocumentResultsOut, ProcessRunOut


router = APIRouter(prefix="/results", tags=["results"])


@router.get("/{document_id}", response_model=DocumentResultsOut)
def get_results(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    runs = (
        db.query(ProcessRun)
        .filter(ProcessRun.document_id == document.id)
        .order_by(ProcessRun.started_at.desc())
        .all()
    )

    metadata = json.loads(document.metadata_json) if document.metadata_json else None
    document_out = DocumentOut(
        id=document.id,
        filename=document.filename,
        stored_path=document.stored_path,
        uploaded_at=document.uploaded_at,
        page_count=document.page_count,
        metadata=metadata,
    )
    runs_out = []
    for run in runs:
        output = json.loads(run.output_json) if run.output_json else None
        runs_out.append(
            ProcessRunOut(
                id=run.id,
                document_id=run.document_id,
                stage=run.stage,
                status=run.status,
                started_at=run.started_at,
                finished_at=run.finished_at,
                output=output,
            )
        )

    return DocumentResultsOut(document=document_out, runs=runs_out)
