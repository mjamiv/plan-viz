# Agents

## construction-vision-executor

**Role**: Expert agent for executing the "Construction Drawing Vision" plan end-to-end.

**Mission**: Deliver a working web app that evaluates open-source AI methods on construction drawing PDFs, with measurable comparisons across OCR, VLMs, layout analysis, and symbol detection.

**Operating principles**
- Bias for running, measurable prototypes over speculation.
- Keep pipelines modular so models can be swapped without rework.
- Record metrics for every run (latency, accuracy proxies, outputs).
- Favor reproducibility: config files, pinned versions, and scripts.

**Scope of responsibility**
- Project scaffolding and environment setup.
- Backend APIs for upload, processing, and results.
- Frontend UI for uploads, previews, and comparisons.
- Model integrations for OCR, VLMs, layout, and detection.
- Evaluation harness, metrics capture, and reporting.
- Deployment configuration for a static frontend on GitHub Pages with a separately hosted API.

**Execution plan**
1. **Phase 1: Foundation**
   - Scaffold backend (FastAPI) and frontend (React or Svelte).
   - Implement PDF upload, storage, rendering, and metadata extraction.
   - Add results schema and persistence.
2. **Phase 2: OCR Pipeline**
   - Integrate PaddleOCR, Tesseract, and Surya.
   - Normalize outputs to a shared bounding-box schema.
   - Add side-by-side UI comparison and baseline metrics.
3. **Phase 3: VLM Integration**
   - Integrate Ollama (Qwen2-VL or LLaVA).
   - Build prompt templates and JSON output parsing.
   - Add multi-page handling and failure recovery.
4. **Phase 4: Layout & Symbol Detection**
   - Integrate LayoutLMv3 and YOLOv8.
   - Add Grounding DINO for open-vocabulary detection.
   - Overlay annotations in the viewer.
5. **Phase 5: Comparison Dashboard**
   - Unify result schemas.
   - Build metrics dashboards and export (JSON/CSV).
   - Add annotation review and qualitative notes.

**Key workflows**
- **Baseline run**: ingest PDF -> render pages -> run OCR -> store results -> compare outputs.
- **Model add-on**: define model config -> implement runner -> normalize output -> add to metrics.
- **Evaluation loop**: run on dataset subset -> collect metrics -> compare -> adjust prompts/configs.

**Data conventions**
- Store raw outputs and normalized outputs separately.
- Use stable IDs for document, page, model run, and artifact.
- Preserve original PDFs and page images for traceability.

**Quality bar**
- Every pipeline stage has unit or smoke tests.
- Every model run is timestamped and repeatable with a config.
- UI shows model, version, runtime, and confidence.

**Ready checks before progressing phases**
- Phase 1: upload/render works on 5 PDFs; results persist.
- Phase 2: OCR outputs normalized; basic accuracy metrics computed.
- Phase 3: VLM returns structured JSON on at least 3 prompt types.
- Phase 4: symbol detection overlays visible and stored.
- Phase 5: dashboard compares at least 3 approaches per category.

**Open questions to confirm with user**
- Preferred frontend framework (React vs Svelte).
- Target storage (SQLite vs Postgres) for results.
- Initial model choice (Qwen2-VL 7B vs LLaVA).
- GPU availability and deployment environment.

**Current status**
- Phase 1 foundation is in place: FastAPI + React app, upload/render, results persistence, and page preview.
- OCR pipeline supports Tesseract, EasyOCR, PaddleOCR, and Surya with normalized word boxes, confidence, and run metrics; UI overlays OCR boxes.
- VLM, layout, and detection routes are wired with basic outputs; VLM uses Ollama on first page only.
- Run outputs are persisted as JSON artifacts with download links; CSV/JSON exports exist per document; optional retention via `RESULTS_RETENTION_DAYS`.
- Frontend framework chosen: React. Storage currently SQLite.
