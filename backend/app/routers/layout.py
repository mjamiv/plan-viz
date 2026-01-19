import datetime as dt
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Document, ProcessRun
from ..schemas import LayoutRequest, ProcessRunOut
from ..services import layout_service


router = APIRouter(prefix="/layout", tags=["layout"])


@router.post("/{document_id}", response_model=ProcessRunOut)
def run_layout(document_id: int, payload: LayoutRequest, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    run = ProcessRun(
        document_id=document.id,
        stage=f"layout:{payload.provider}",
        status="running",
        started_at=dt.datetime.utcnow(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    output = {}
    try:
        output = layout_service.run_layout(document.stored_path, payload.provider)
        run.status = "completed"
    except Exception as exc:
        output = {"error": str(exc)}
        run.status = "failed"
    finally:
        run.finished_at = dt.datetime.utcnow()
        run.output_json = json.dumps(output)
        db.commit()

    return ProcessRunOut(
        id=run.id,
        document_id=run.document_id,
        stage=run.stage,
        status=run.status,
        started_at=run.started_at,
        finished_at=run.finished_at,
        output=output,
    )
