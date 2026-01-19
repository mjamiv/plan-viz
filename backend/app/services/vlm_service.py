import base64
import io
import json
from typing import Any, Dict

import httpx
from pdf2image import convert_from_path


PROMPTS = {
    "room_dimensions": "List all room names and their dimensions.",
    "title_block": "Identify the title block information.",
    "electrical_layout": "Describe the electrical layout.",
    "revision_history": "Extract the revision history.",
    "drawing_scale": "What scale is this drawing?",
}


def _render_first_page_base64(pdf_path: str, dpi: int = 200) -> str:
    images = convert_from_path(pdf_path, dpi=dpi, first_page=1, last_page=1)
    if not images:
        raise RuntimeError("Failed to render PDF page.")
    image = images[0]
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def run_vlm(
    pdf_path: str,
    prompt_key: str,
    model: str = "qwen2-vl:7b",
    ollama_url: str = "http://localhost:11434",
) -> Dict[str, Any]:
    if prompt_key not in PROMPTS:
        raise RuntimeError(f"Unknown prompt_key '{prompt_key}'.")

    image_b64 = _render_first_page_base64(pdf_path)
    prompt = PROMPTS[prompt_key]

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
    return {
        "model": model,
        "prompt_key": prompt_key,
        "prompt": prompt,
        "output": output,
    }
