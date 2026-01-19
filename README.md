# Construction Vision

Cutting-edge evaluation harness for AI vision methods on construction drawing PDFs.

## Backend

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Notes

- `pdf2image` requires Poppler on your system.
- The API expects `http://localhost:5173` for CORS during local dev.
- OCR uses `pytesseract` by default; install Tesseract OCR on your system for it to work.
- VLM runs are wired to Ollama. Install Ollama and pull `qwen2-vl:7b`:
  - `ollama pull qwen2-vl:7b`
- LayoutLMv3 uses `LAYOUTLMV3_MODEL` to select a model (default: `microsoft/layoutlmv3-base-finetuned-funsd`).
- YOLOv8 detection works if you install `ultralytics` and have a model (default `yolov8n.pt` via `YOLO_MODEL_PATH`).
- Grounding DINO uses `GROUNDING_DINO_MODEL` (default: `IDEA-Research/grounding-dino-base`) and requires target labels.
- Page images are served from `/files` when you run the backend locally.

## Development workflow

1. Upload a PDF.
2. Render pages (produces preview images and page metadata).
3. Run OCR, VLM, Layout, or Detection; compare outputs by run.

## Deployment (planned)

- The frontend is a static Vite app suitable for GitHub Pages.
- The backend must be hosted separately (GPU optional).
- Next step: add an environment-based API base URL for GitHub Pages builds.
