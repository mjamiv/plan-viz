import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Document, ProcessRun


router = APIRouter(prefix="/metrics", tags=["metrics"])


def _parse_run_metrics(run: ProcessRun) -> Dict[str, Any]:
    """Extract standardized metrics from a run."""
    output = json.loads(run.output_json) if run.output_json else {}
    metrics = output.get("metrics") if isinstance(output, dict) else {}
    if not isinstance(metrics, dict):
        metrics = {}

    pages = output.get("pages") if isinstance(output, dict) else []
    if not isinstance(pages, list):
        pages = []

    # Calculate aggregate metrics
    total_words = 0
    total_detections = 0
    total_tokens = 0
    confidences = []

    for page in pages:
        if isinstance(page, dict):
            # OCR words
            words = page.get("words", [])
            if isinstance(words, list):
                total_words += len(words)
                for word in words:
                    conf = word.get("confidence")
                    if conf is not None:
                        confidences.append(float(conf))

            # Detection results
            detections = page.get("detections", [])
            if isinstance(detections, list):
                total_detections += len(detections)
                for det in detections:
                    conf = det.get("confidence")
                    if conf is not None:
                        confidences.append(float(conf))

            # Layout tokens
            tokens = page.get("tokens", [])
            if isinstance(tokens, list):
                total_tokens += len(tokens)
                for tok in tokens:
                    conf = tok.get("score")
                    if conf is not None:
                        confidences.append(float(conf))

    elapsed_ms = metrics.get("elapsed_ms")
    if elapsed_ms is None and run.started_at and run.finished_at:
        elapsed_ms = int((run.finished_at - run.started_at).total_seconds() * 1000)

    avg_confidence = sum(confidences) / len(confidences) if confidences else None

    # Parse stage to get provider info
    stage_parts = run.stage.split(":")
    stage_type = stage_parts[0] if stage_parts else run.stage
    provider = stage_parts[1] if len(stage_parts) > 1 else None

    return {
        "run_id": run.id,
        "stage": run.stage,
        "stage_type": stage_type,
        "provider": provider,
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "elapsed_ms": elapsed_ms,
        "page_count": metrics.get("page_count", len(pages) if pages else None),
        "word_count": metrics.get("word_count", total_words or None),
        "detection_count": total_detections or None,
        "token_count": total_tokens or None,
        "avg_confidence": avg_confidence,
        "model": output.get("model"),
        "prompt_key": output.get("prompt_key"),
    }


@router.get("/{document_id}")
def get_document_metrics(document_id: int, db: Session = Depends(get_db)):
    """Get unified metrics for all runs of a document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    runs = (
        db.query(ProcessRun)
        .filter(ProcessRun.document_id == document.id)
        .order_by(ProcessRun.started_at.desc())
        .all()
    )

    metrics_list = [_parse_run_metrics(run) for run in runs]

    # Group by stage type for comparison
    by_stage = {}
    for m in metrics_list:
        stage_type = m["stage_type"]
        if stage_type not in by_stage:
            by_stage[stage_type] = []
        by_stage[stage_type].append(m)

    return {
        "document_id": document.id,
        "document_filename": document.filename,
        "total_runs": len(runs),
        "runs": metrics_list,
        "by_stage": by_stage,
    }


@router.get("/{document_id}/compare/{stage_type}")
def compare_runs(document_id: int, stage_type: str, db: Session = Depends(get_db)):
    """Compare runs of the same stage type (e.g., compare OCR providers)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    runs = (
        db.query(ProcessRun)
        .filter(ProcessRun.document_id == document.id)
        .filter(ProcessRun.stage.startswith(f"{stage_type}:"))
        .order_by(ProcessRun.started_at.desc())
        .all()
    )

    if not runs:
        return {"document_id": document.id, "stage_type": stage_type, "runs": []}

    metrics_list = [_parse_run_metrics(run) for run in runs]

    # Find best performers
    fastest = min(
        (m for m in metrics_list if m["elapsed_ms"] is not None),
        key=lambda x: x["elapsed_ms"],
        default=None,
    )
    most_confident = max(
        (m for m in metrics_list if m["avg_confidence"] is not None),
        key=lambda x: x["avg_confidence"],
        default=None,
    )

    return {
        "document_id": document.id,
        "stage_type": stage_type,
        "runs": metrics_list,
        "summary": {
            "fastest_provider": fastest["provider"] if fastest else None,
            "fastest_elapsed_ms": fastest["elapsed_ms"] if fastest else None,
            "highest_confidence_provider": most_confident["provider"] if most_confident else None,
            "highest_confidence": most_confident["avg_confidence"] if most_confident else None,
        },
    }
