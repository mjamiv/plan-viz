# Construction Vision - Working Notes

## Project summary
- FastAPI backend + React (Vite) frontend for evaluating OCR/VLM/layout/detection on construction PDF drawings.
- Runs are persisted in SQLite (`backend/app/data/app.db`), with JSON artifacts in `backend/app/data/results`.
- Frontend provides upload, run controls, overlays, and export links.

## Local dev
Backend:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Key endpoints
- `POST /upload/` upload PDF
- `POST /process/{document_id}` render pages
- `POST /ocr/{document_id}` run OCR
- `POST /vlm/{document_id}` run VLM
- `POST /layout/{document_id}` run layout analysis
- `POST /detect/{document_id}` run detection
- `GET /results/{document_id}` runs + outputs
- `GET /results/{document_id}/export.csv`
- `GET /results/{document_id}/export.json`

## Data locations
- `backend/app/data/uploads` uploaded PDFs
- `backend/app/data/pages` rendered PNGs
- `backend/app/data/results` JSON artifacts

## Environment variables
- `ALLOWED_ORIGINS`
- `LAYOUTLMV3_MODEL`
- `GROUNDING_DINO_MODEL`
- `YOLO_MODEL_PATH`
- `RESULTS_RETENTION_DAYS`
- `VITE_API_BASE`, `VITE_BASE` (frontend)

## Notes
- OCR providers: Tesseract, EasyOCR, PaddleOCR, Surya (install per provider).
- VLM uses Ollama (`qwen2-vl:7b`) and processes first page only.
