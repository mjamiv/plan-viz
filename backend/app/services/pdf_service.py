import json
import os
import uuid
from typing import Any, Dict, List

import fitz
from pdf2image import convert_from_path


def ensure_dirs(base_dir: str) -> Dict[str, str]:
    uploads_dir = os.path.join(base_dir, "uploads")
    pages_dir = os.path.join(base_dir, "pages")
    results_dir = os.path.join(base_dir, "results")
    for path in (uploads_dir, pages_dir, results_dir):
        os.makedirs(path, exist_ok=True)
    return {"uploads": uploads_dir, "pages": pages_dir, "results": results_dir}


def save_upload(file_name: str, content: bytes, uploads_dir: str) -> str:
    ext = os.path.splitext(file_name)[1] or ".pdf"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(uploads_dir, stored_name)
    with open(stored_path, "wb") as handle:
        handle.write(content)
    return stored_path


def extract_metadata(pdf_path: str) -> Dict[str, Any]:
    doc = fitz.open(pdf_path)
    metadata = doc.metadata or {}
    metadata["page_count"] = doc.page_count
    doc.close()
    return metadata


def render_pages(pdf_path: str, pages_dir: str, dpi: int = 200) -> List[Dict[str, Any]]:
    images = convert_from_path(pdf_path, dpi=dpi)
    output_pages: List[Dict[str, Any]] = []
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    for idx, image in enumerate(images, start=1):
        file_name = f"{base_name}_page_{idx}.png"
        file_path = os.path.join(pages_dir, file_name)
        image.save(file_path, "PNG")
        output_pages.append(
            {
                "page": idx,
                "path": file_path,
                "width": image.width,
                "height": image.height,
            }
        )
    return output_pages


def write_json(output: Dict[str, Any], results_dir: str, stem: str) -> str:
    file_path = os.path.join(results_dir, f"{stem}.json")
    with open(file_path, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(output, indent=2))
    return file_path
