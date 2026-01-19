import datetime as dt
import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Document, ProcessRun
from ..schemas import ProcessRunOut, VlmRequest
from ..services import pdf_service, vlm_service


router = APIRouter(prefix="/vlm", tags=["vlm"])


@router.post("/{document_id}", response_model=ProcessRunOut)
def run_vlm(document_id: int, payload: VlmRequest, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    run = ProcessRun(
        document_id=document.id,
        stage=f"vlm:{payload.model}:{payload.prompt_key}",
        status="running",
        started_at=dt.datetime.utcnow(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    output = {}
    try:
        output = vlm_service.run_vlm(
            document.stored_path,
            prompt_key=payload.prompt_key,
            model=payload.model,
        )
        run.status = "completed"
    except Exception as exc:
        output = {"error": str(exc)}
        run.status = "failed"
    finally:
        run.finished_at = dt.datetime.utcnow()
        base_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        dirs = pdf_service.ensure_dirs(os.path.abspath(base_dir))
        stem = f"run_{run.id}_{run.stage.replace(':', '_')}"
        artifact_path = pdf_service.write_json(output, dirs["results"], stem)
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
        relative_path = os.path.relpath(artifact_path, base_dir)
        output["artifact"] = {
            "path": artifact_path,
            "url": f"/files/{relative_path.replace(os.sep, '/')}",
        }
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
