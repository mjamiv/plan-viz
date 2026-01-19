import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Response
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


def _extract_metrics(run: ProcessRun) -> dict:
    output = json.loads(run.output_json) if run.output_json else {}
    metrics = output.get("metrics") if isinstance(output, dict) else {}
    if not isinstance(metrics, dict):
        metrics = {}

    detections = 0
    tokens = 0
    words = 0
    page_count = None
    pages = output.get("pages") if isinstance(output, dict) else None
    if isinstance(pages, list):
        page_count = len(pages)
        for page in pages:
            if isinstance(page, dict):
                detections += len(page.get("detections") or [])
                tokens += int(page.get("token_count") or 0)
                words += len(page.get("words") or [])

    prompt_key = output.get("prompt_key") if isinstance(output, dict) else None
    model = output.get("model") if isinstance(output, dict) else None

    return {
        "elapsed_ms": metrics.get("elapsed_ms"),
        "page_count": metrics.get("page_count", page_count),
        "word_count": metrics.get("word_count", words or None),
        "avg_confidence": metrics.get("avg_confidence"),
        "detections": detections or None,
        "tokens": tokens or None,
        "prompt_key": prompt_key,
        "model": model,
    }


@router.get("/{document_id}/export.csv")
def export_results_csv(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    runs = (
        db.query(ProcessRun)
        .filter(ProcessRun.document_id == document.id)
        .order_by(ProcessRun.started_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "document_id",
            "document_filename",
            "run_id",
            "stage",
            "status",
            "started_at",
            "finished_at",
            "elapsed_ms",
            "page_count",
            "word_count",
            "avg_confidence",
            "detections",
            "tokens",
            "prompt_key",
            "model",
        ],
    )
    writer.writeheader()
    for run in runs:
        metrics = _extract_metrics(run)
        writer.writerow(
            {
                "document_id": document.id,
                "document_filename": document.filename,
                "run_id": run.id,
                "stage": run.stage,
                "status": run.status,
                "started_at": run.started_at.isoformat() if run.started_at else "",
                "finished_at": run.finished_at.isoformat() if run.finished_at else "",
                **metrics,
            }
        )

    return Response(content=output.getvalue(), media_type="text/csv")


@router.get("/{document_id}/export.json")
def export_results_json(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    runs = (
        db.query(ProcessRun)
        .filter(ProcessRun.document_id == document.id)
        .order_by(ProcessRun.started_at.desc())
        .all()
    )

    rows = []
    for run in runs:
        metrics = _extract_metrics(run)
        rows.append(
            {
                "document_id": document.id,
                "document_filename": document.filename,
                "run_id": run.id,
                "stage": run.stage,
                "status": run.status,
                "started_at": run.started_at.isoformat() if run.started_at else None,
                "finished_at": run.finished_at.isoformat() if run.finished_at else None,
                **metrics,
            }
        )

    return {"document_id": document.id, "document_filename": document.filename, "runs": rows}
