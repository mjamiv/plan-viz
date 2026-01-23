# Poppler Fix Plan

## Problem
"Unable to get page count. Is poppler installed and in PATH?" error when processing PDFs.

## Root Cause
The `pdf2image` library requires Poppler binaries. On Windows, Poppler is not in PATH by default.

## Solution
Added `POPPLER_PATH` constant to all backend services that use `convert_from_path()`:

### Files Modified
1. `backend/app/services/pdf_service.py` - render_pages()
2. `backend/app/services/vlm_service.py` - _render_all_pages_base64()
3. `backend/app/services/ocr_service.py` - run_ocr()
4. `backend/app/services/detection_service.py` - _run_yolov8(), _run_grounding_dino()
5. `backend/app/services/layout_service.py` - run_layout()

### Configuration
```python
POPPLER_PATH = os.environ.get(
    "POPPLER_PATH",
    r"C:\Users\michael.martello\Downloads\poppler-install\poppler-25.07.0\Library\bin"
)
```

Each `convert_from_path()` call now includes `poppler_path=POPPLER_PATH`.

## Verification
1. Kill all Python processes
2. Restart backend with: `venv/Scripts/python.exe -m uvicorn backend.app.main:app --reload`
3. Upload and process a PDF

## Status
IMPLEMENTED - Backend restart required
