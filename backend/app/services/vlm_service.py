import base64
import io
import json
import time
from typing import Any, Dict, List, Optional

import httpx
from pdf2image import convert_from_path


PROMPTS = {
    "room_dimensions": "List all room names and their dimensions.",
    "title_block": "Identify the title block information.",
    "electrical_layout": "Describe the electrical layout.",
    "revision_history": "Extract the revision history.",
    "drawing_scale": "What scale is this drawing?",
}


def _render_page_base64(image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _render_all_pages_base64(pdf_path: str, dpi: int = 200) -> List[Dict[str, Any]]:
    images = convert_from_path(pdf_path, dpi=dpi)
    if not images:
        raise RuntimeError("Failed to render PDF pages.")
    pages = []
    for index, image in enumerate(images, start=1):
        pages.append({
            "page": index,
            "width": image.width,
            "height": image.height,
            "base64": _render_page_base64(image),
        })
    return pages


def _query_ollama(
    image_b64: str,
    prompt: str,
    model: str,
    ollama_url: str,
) -> Dict[str, Any]:
    payload = {
        "model": model,
        "prompt": f"Respond in JSON only. {prompt}",
        "images": [image_b64],
        "stream": False,
    }

    with httpx.Client(timeout=120) as client:
        response = client.post(f"{ollama_url}/api/generate", json=payload)
        response.raise_for_status()
        data = response.json()

    text = data.get("response", "")
    output = {"raw": text}
    try:
        output["parsed"] = json.loads(text)
    except Exception:
        output["parsed_error"] = "Failed to parse JSON from model response."
    return output


def run_vlm(
    pdf_path: str,
    prompt_key: str,
    model: str = "qwen2-vl:7b",
    ollama_url: str = "http://localhost:11434",
    max_pages: Optional[int] = None,
) -> Dict[str, Any]:
    if prompt_key not in PROMPTS:
        raise RuntimeError(f"Unknown prompt_key '{prompt_key}'.")

    start_time = time.perf_counter()
    all_pages = _render_all_pages_base64(pdf_path)
    prompt = PROMPTS[prompt_key]

    if max_pages is not None and max_pages > 0:
        all_pages = all_pages[:max_pages]

    pages_output = []
    for page_info in all_pages:
        page_start = time.perf_counter()
        output = _query_ollama(page_info["base64"], prompt, model, ollama_url)
        page_elapsed = int((time.perf_counter() - page_start) * 1000)
        pages_output.append({
            "page": page_info["page"],
            "width": page_info["width"],
            "height": page_info["height"],
            "output": output,
            "elapsed_ms": page_elapsed,
        })

    total_elapsed = int((time.perf_counter() - start_time) * 1000)

    combined_parsed = []
    for page in pages_output:
        if page["output"].get("parsed"):
            combined_parsed.append({
                "page": page["page"],
                "data": page["output"]["parsed"],
            })

    return {
        "model": model,
        "prompt_key": prompt_key,
        "prompt": prompt,
        "pages": pages_output,
        "parsed": combined_parsed if combined_parsed else None,
        "metrics": {
            "page_count": len(pages_output),
            "elapsed_ms": total_elapsed,
        },
    }
