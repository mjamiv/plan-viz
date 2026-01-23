import os
from functools import lru_cache
from typing import Any, Dict, List

import torch
from pdf2image import convert_from_path

# Poppler path for Windows
POPPLER_PATH = os.environ.get(
    "POPPLER_PATH",
    r"C:\Users\michael.martello\Downloads\poppler-install\poppler-25.07.0\Library\bin"
)


@lru_cache(maxsize=1)
def _load_layoutlmv3():
    try:
        from transformers import LayoutLMv3ForTokenClassification, LayoutLMv3Processor
    except ImportError as exc:
        raise RuntimeError("transformers is not installed.") from exc

    model_name = os.getenv(
        "LAYOUTLMV3_MODEL",
        "microsoft/layoutlmv3-base-finetuned-funsd",
    )
    processor = LayoutLMv3Processor.from_pretrained(model_name)
    model = LayoutLMv3ForTokenClassification.from_pretrained(model_name)
    model.eval()
    return processor, model, model_name


def _ocr_words(image) -> Dict[str, List[Any]]:
    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("pytesseract is not installed.") from exc

    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    words = []
    boxes = []
    for text, x, y, w, h in zip(
        data["text"], data["left"], data["top"], data["width"], data["height"]
    ):
        if not text or not text.strip():
            continue
        words.append(text.strip())
        boxes.append([x, y, x + w, y + h])
    return {"words": words, "boxes": boxes}


def _normalize_boxes(boxes: List[List[int]], width: int, height: int) -> List[List[int]]:
    normalized = []
    for x0, y0, x1, y1 in boxes:
        normalized.append(
            [
                int(1000 * x0 / width),
                int(1000 * y0 / height),
                int(1000 * x1 / width),
                int(1000 * y1 / height),
            ]
        )
    return normalized


def run_layout(pdf_path: str, provider: str) -> Dict[str, Any]:
    provider_key = provider.lower().strip()
    if provider_key != "layoutlmv3":
        raise RuntimeError(f"Unknown layout provider '{provider}'.")

    processor, model, model_name = _load_layoutlmv3()
    images = convert_from_path(pdf_path, dpi=200, poppler_path=POPPLER_PATH)

    pages = []
    for page_index, image in enumerate(images, start=1):
        ocr = _ocr_words(image)
        if not ocr["words"]:
            pages.append({"page": page_index, "tokens": [], "note": "No OCR tokens."})
            continue
        norm_boxes = _normalize_boxes(ocr["boxes"], image.width, image.height)
        encoding = processor(
            image,
            ocr["words"],
            boxes=norm_boxes,
            return_tensors="pt",
            truncation=True,
        )
        with torch.no_grad():
            outputs = model(**encoding)
        logits = outputs.logits[0]
        probs = torch.softmax(logits, dim=-1)
        word_ids = encoding.word_ids()
        seen = set()
        tokens = []
        for idx, word_id in enumerate(word_ids):
            if word_id is None or word_id in seen:
                continue
            seen.add(word_id)
            label_id = int(torch.argmax(logits[idx]).item())
            score = float(probs[idx][label_id].item())
            label = model.config.id2label.get(label_id, str(label_id))
            tokens.append(
                {
                    "word": ocr["words"][word_id],
                    "bbox": norm_boxes[word_id],
                    "label": label,
                    "score": score,
                }
            )
        pages.append(
            {
                "page": page_index,
                "token_count": len(tokens),
                "tokens": tokens,
            }
        )

    return {"provider": provider_key, "model": model_name, "pages": pages}
