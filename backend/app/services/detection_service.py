import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

import torch
from pdf2image import convert_from_path


def _run_yolov8(pdf_path: str, targets: Optional[List[str]] = None) -> Dict[str, Any]:
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError("ultralytics is not installed.") from exc

    model_path = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
    model = YOLO(model_path)
    images = convert_from_path(pdf_path, dpi=200)
    target_set = {target.lower() for target in targets or []}

    pages = []
    for page_index, image in enumerate(images, start=1):
        results = model.predict(source=image, verbose=False)
        page_detections = []
        for result in results:
            names = result.names or {}
            for box in result.boxes:
                cls_id = int(box.cls[0]) if box.cls is not None else -1
                label = names.get(cls_id, str(cls_id))
                if target_set and label.lower() not in target_set:
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0]) if box.conf is not None else 0.0
                page_detections.append(
                    {
                        "label": label,
                        "confidence": confidence,
                        "bbox": [x1, y1, x2, y2],
                    }
                )
        pages.append({"page": page_index, "detections": page_detections})
    return {"provider": "yolov8", "pages": pages}


@lru_cache(maxsize=1)
def _load_grounding_dino():
    try:
        from transformers import GroundingDinoForObjectDetection, GroundingDinoProcessor
    except ImportError as exc:
        raise RuntimeError("transformers is not installed.") from exc

    model_name = os.getenv(
        "GROUNDING_DINO_MODEL", "IDEA-Research/grounding-dino-base"
    )
    processor = GroundingDinoProcessor.from_pretrained(model_name)
    model = GroundingDinoForObjectDetection.from_pretrained(model_name)
    model.eval()
    return processor, model, model_name


def _run_grounding_dino(
    pdf_path: str, targets: Optional[List[str]] = None
) -> Dict[str, Any]:
    if not targets:
        raise RuntimeError("Grounding DINO requires target labels.")
    processor, model, model_name = _load_grounding_dino()
    images = convert_from_path(pdf_path, dpi=200)
    query = ". ".join(targets)

    pages = []
    for page_index, image in enumerate(images, start=1):
        inputs = processor(images=image, text=query, return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs)
        target_sizes = torch.tensor([[image.height, image.width]])
        results = processor.post_process_grounded_object_detection(
            outputs, target_sizes=target_sizes, box_threshold=0.25, text_threshold=0.25
        )
        detections = []
        for box, score, label in zip(
            results[0]["boxes"], results[0]["scores"], results[0]["labels"]
        ):
            x1, y1, x2, y2 = [float(value) for value in box.tolist()]
            detections.append(
                {
                    "label": str(label),
                    "confidence": float(score),
                    "bbox": [x1, y1, x2, y2],
                }
            )
        pages.append({"page": page_index, "detections": detections})
    return {"provider": "grounding_dino", "model": model_name, "pages": pages}


def run_detection(
    pdf_path: str,
    provider: str,
    targets: Optional[List[str]] = None,
) -> Dict[str, Any]:
    provider_key = provider.lower().strip()
    if provider_key == "yolov8":
        return _run_yolov8(pdf_path, targets=targets)
    if provider_key == "grounding_dino":
        return _run_grounding_dino(pdf_path, targets=targets)
    raise RuntimeError(f"Unknown detection provider '{provider}'.")
