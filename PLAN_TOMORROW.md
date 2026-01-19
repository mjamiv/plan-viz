# Plan - Tomorrow

## Goals
- Run a brief functionality test end-to-end (upload -> render -> OCR -> overlay).
- Validate exports + artifact downloads.
- Prep GitHub Pages deployment and backend CORS.

## Setup checklist
- Poppler installed (for `pdf2image`).
- Tesseract installed (for OCR baseline).
- Python deps installed (`pip install -r requirements.txt`).
- Node deps installed (`npm install` in `frontend`).

## Smoke test flow
1. Start backend: `uvicorn backend.app.main:app --reload`.
2. Start frontend: `npm run dev` in `frontend`.
3. Upload a PDF and render pages.
4. Run OCR (Tesseract) and confirm:
   - word overlays appear
   - run metrics show word count
   - artifact link downloads JSON
5. Export results:
   - `GET /results/{document_id}/export.csv`
   - `GET /results/{document_id}/export.json`

## Deployment checklist (GitHub Pages)
- Confirm repo name matches `VITE_BASE` (`/plan-viz/`) or update workflow.
- Set repo secret `VITE_API_BASE` to hosted backend URL.
- Add Pages URL to backend `ALLOWED_ORIGINS`.
- Push to `main` to trigger `.github/workflows/deploy-frontend.yml`.

## If time allows
- Add a minimal comparison table in the UI (run list + metrics).
- Add a small smoke-test script or Makefile targets.
