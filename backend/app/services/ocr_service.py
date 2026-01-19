import os
from typing import Any, Dict, List

from pdf2image import convert_from_path


def _run_tesseract(images) -> List[Dict[str, Any]]:
    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("pytesseract is not installed.") from exc

    results = []
    for index, image in enumerate(images, start=1):
        text = pytesseract.image_to_string(image)
        results.append({"page": index, "text": text})
    return results


def _run_placeholder(provider: str) -> List[Dict[str, Any]]:
    raise RuntimeError(f"OCR provider '{provider}' is not configured yet.")


def run_ocr(pdf_path: str, provider: str, dpi: int = 200) -> Dict[str, Any]:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError("PDF not found.")

    images = convert_from_path(pdf_path, dpi=dpi)
    provider_key = provider.lower().strip()
    if provider_key == "tesseract":
        pages = _run_tesseract(images)
    elif provider_key in {"paddleocr", "surya", "easyocr"}:
        pages = _run_placeholder(provider_key)
    else:
        raise RuntimeError(f"Unknown OCR provider '{provider}'.")

    return {"provider": provider_key, "pages": pages}
