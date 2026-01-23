import os
import time
from typing import Any, Dict, List, Optional

from pdf2image import convert_from_path

# Poppler path for Windows
POPPLER_PATH = os.environ.get(
    "POPPLER_PATH",
    r"C:\Users\michael.martello\Downloads\poppler-install\poppler-25.07.0\Library\bin"
)


def _parse_confidence(value: str) -> Optional[float]:
    if value is None:
        return None
    try:
        score = float(value)
    except ValueError:
        return None
    if score < 0:
        return None
    return score


def _run_tesseract(images) -> List[Dict[str, Any]]:
    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("pytesseract is not installed.") from exc

    results = []
    for index, image in enumerate(images, start=1):
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        words = []
        for text, x, y, w, h, conf in zip(
            data.get("text", []),
            data.get("left", []),
            data.get("top", []),
            data.get("width", []),
            data.get("height", []),
            data.get("conf", []),
        ):
            if not text or not text.strip():
                continue
            words.append(
                {
                    "text": text.strip(),
                    "bbox": [x, y, x + w, y + h],
                    "confidence": _parse_confidence(conf),
                }
            )
        results.append(
            {
                "page": index,
                "width": image.width,
                "height": image.height,
                "words": words,
            }
        )
    return results


def _run_easyocr(images) -> List[Dict[str, Any]]:
    try:
        import easyocr
    except ImportError as exc:
        raise RuntimeError("easyocr is not installed.") from exc

    reader = easyocr.Reader(["en"], gpu=False)
    results = []
    for index, image in enumerate(images, start=1):
        page_words = []
        for bbox, text, conf in reader.readtext(image):
            if not text or not text.strip():
                continue
            xs = [point[0] for point in bbox]
            ys = [point[1] for point in bbox]
            page_words.append(
                {
                    "text": text.strip(),
                    "bbox": [min(xs), min(ys), max(xs), max(ys)],
                    "confidence": float(conf) if conf is not None else None,
                }
            )
        results.append(
            {
                "page": index,
                "width": image.width,
                "height": image.height,
                "words": page_words,
            }
        )
    return results


def _run_paddleocr(images) -> List[Dict[str, Any]]:
    try:
        import numpy as np
    except ImportError as exc:
        raise RuntimeError("numpy is required for paddleocr.") from exc
    try:
        from paddleocr import PaddleOCR
    except ImportError as exc:
        raise RuntimeError("paddleocr is not installed.") from exc

    ocr = PaddleOCR(use_angle_cls=True, lang="en")
    results = []
    for index, image in enumerate(images, start=1):
        page_words = []
        ocr_result = ocr.ocr(np.array(image), cls=True)
        for line in ocr_result or []:
            for box, (text, conf) in line:
                if not text or not text.strip():
                    continue
                xs = [point[0] for point in box]
                ys = [point[1] for point in box]
                page_words.append(
                    {
                        "text": text.strip(),
                        "bbox": [min(xs), min(ys), max(xs), max(ys)],
                        "confidence": float(conf) if conf is not None else None,
                    }
                )
        results.append(
            {
                "page": index,
                "width": image.width,
                "height": image.height,
                "words": page_words,
            }
        )
    return results


def _run_surya(images) -> List[Dict[str, Any]]:
    try:
        from surya.model.recognition import RecognitionPredictor
        from surya.model.detection import DetectionPredictor
    except ImportError as exc:
        raise RuntimeError("surya-ocr is not installed.") from exc
    try:
        import numpy as np
    except ImportError as exc:
        raise RuntimeError("numpy is required for surya.") from exc

    det = DetectionPredictor()
    rec = RecognitionPredictor()
    results = []
    for index, image in enumerate(images, start=1):
        img_np = np.array(image)
        det_results = det([img_np])
        rec_results = rec([img_np], det_results)
        page_words = []
        for line in rec_results[0]:
            text = getattr(line, "text", None)
            if not text or not text.strip():
                continue
            bbox = getattr(line, "bbox", None) or getattr(line, "polygon", None)
            confidence = getattr(line, "confidence", None)
            if bbox:
                xs = [point[0] for point in bbox]
                ys = [point[1] for point in bbox]
                page_words.append(
                    {
                        "text": text.strip(),
                        "bbox": [min(xs), min(ys), max(xs), max(ys)],
                        "confidence": float(confidence) if confidence is not None else None,
                    }
                )
        results.append(
            {
                "page": index,
                "width": image.width,
                "height": image.height,
                "words": page_words,
            }
        )
    return results


def _run_placeholder(provider: str) -> List[Dict[str, Any]]:
    raise RuntimeError(f"OCR provider '{provider}' is not configured yet.")


def _summarize(pages: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_words = 0
    confidences: List[float] = []
    for page in pages:
        for word in page.get("words", []):
            total_words += 1
            score = word.get("confidence")
            if score is not None:
                confidences.append(score)
    avg_conf = sum(confidences) / len(confidences) if confidences else None
    return {"page_count": len(pages), "word_count": total_words, "avg_confidence": avg_conf}


def run_ocr(pdf_path: str, provider: str, dpi: int = 200) -> Dict[str, Any]:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError("PDF not found.")

    start_time = time.perf_counter()
    images = convert_from_path(pdf_path, dpi=dpi, poppler_path=POPPLER_PATH)
    provider_key = provider.lower().strip()
    if provider_key == "tesseract":
        pages = _run_tesseract(images)
    elif provider_key == "easyocr":
        pages = _run_easyocr(images)
    elif provider_key == "paddleocr":
        pages = _run_paddleocr(images)
    elif provider_key == "surya":
        pages = _run_surya(images)
    else:
        raise RuntimeError(f"Unknown OCR provider '{provider}'.")

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    return {
        "provider": provider_key,
        "pages": pages,
        "metrics": {**_summarize(pages), "elapsed_ms": elapsed_ms},
    }
