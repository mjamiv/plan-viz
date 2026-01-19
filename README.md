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
- OCR supports Tesseract, EasyOCR, PaddleOCR, and Surya; install the provider you plan to run.
- VLM runs are wired to Ollama. Install Ollama and pull `qwen2-vl:7b`:
  - `ollama pull qwen2-vl:7b`
- LayoutLMv3 uses `LAYOUTLMV3_MODEL` to select a model (default: `microsoft/layoutlmv3-base-finetuned-funsd`).
- YOLOv8 detection works if you install `ultralytics` and have a model (default `yolov8n.pt` via `YOLO_MODEL_PATH`).
- Grounding DINO uses `GROUNDING_DINO_MODEL` (default: `IDEA-Research/grounding-dino-base`) and requires target labels.
- Page images are served from `/files` when you run the backend locally.
- Run outputs are persisted as JSON artifacts in `backend/app/data/results` and are exposed via `/files`.

## Development workflow

1. Upload a PDF.
2. Render pages (produces preview images and page metadata).
3. Run OCR, VLM, Layout, or Detection; compare outputs by run.

## Exports

- `GET /results/{document_id}/export.csv`
- `GET /results/{document_id}/export.json`

## Deployment (planned)

- The frontend is a static Vite app suitable for GitHub Pages.
- The backend must be hosted separately (GPU optional).
- The GitHub Actions workflow builds `frontend` and publishes to GitHub Pages.
- Set repository secret `VITE_API_BASE` to your hosted API URL (e.g. `https://api.example.com`).
- For local overrides, copy `frontend/.env.example` to `frontend/.env.local`.

## Environment variables

Frontend:
- `VITE_API_BASE`: API base URL for the frontend to call.
- `VITE_BASE`: Vite base path (use `/plan-viz/` for GitHub Pages).

Backend:
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins.
- `LAYOUTLMV3_MODEL`: LayoutLMv3 model name or path.
- `GROUNDING_DINO_MODEL`: Grounding DINO model name or path.
- `YOLO_MODEL_PATH`: YOLOv8 model path.
- `RESULTS_RETENTION_DAYS`: Optional cleanup for artifacts on startup.
