# Construction Drawing Vision: Development Plan

A web application to evaluate open-source AI methods for understanding construction drawings in PDF format.

---

## 1. Problem Statement

Construction drawings present unique challenges for AI vision systems:
- Mixed content: vector CAD exports, scanned raster images, or hybrid
- Dense technical information: dimensions, annotations, symbols, title blocks
- Domain-specific notation: architectural symbols, electrical schematics, structural callouts
- Variable quality: some born-digital, others scanned from paper
- Metadata inconsistency: some PDFs contain extractable text/layers, others are flat images

**Goal**: Build a test harness to compare different AI approaches and identify which performs best for specific drawing types.

---

## 2. Open Source Technology Candidates

### 2.1 Vision-Language Models (VLMs)

| Model | Strengths | Notes |
|-------|-----------|-------|
| **Qwen2-VL** | State-of-art open VLM, handles documents well | 2B/7B/72B sizes available |
| **InternVL2** | Strong document understanding | Good at technical diagrams |
| **LLaVA-NeXT** | Solid general-purpose, easy to deploy | Multiple backbone options |
| **Florence-2** | Microsoft's efficient vision model | Good for detection tasks |
| **Phi-3-Vision** | Small but capable, fast inference | 4.2B parameters |
| **MiniCPM-V** | Designed for documents/OCR | Efficient for edge deployment |

### 2.2 Document-Specific Models

| Model | Purpose |
|-------|---------|
| **Donut** | End-to-end document understanding without OCR |
| **Nougat** | Academic documents, good with technical content |
| **LayoutLMv3** | Document structure understanding |
| **DocTR** | Document text recognition |
| **Surya** | Multilingual OCR + layout detection |

### 2.3 OCR & Text Extraction

| Tool | Notes |
|------|-------|
| **PaddleOCR** | Fast, accurate, good CJK support |
| **EasyOCR** | Simple API, 80+ languages |
| **Tesseract 5** | Classic, improved LSTM engine |
| **Surya** | Modern alternative, layout-aware |

### 2.4 PDF Processing

| Library | Use Case |
|---------|----------|
| **PyMuPDF (fitz)** | Fast extraction, rendering, metadata |
| **pdfplumber** | Table/text extraction with coordinates |
| **pdf2image** | High-quality rasterization |
| **pikepdf** | Low-level PDF manipulation |

### 2.5 Object Detection (for symbols/components)

| Model | Notes |
|-------|-------|
| **YOLOv8/YOLOv10** | Fast detection, easy fine-tuning |
| **RT-DETR** | Transformer-based, real-time |
| **Grounding DINO** | Open-vocabulary detection |
| **OWLv2** | Zero-shot object detection |

---

## 3. Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Interface                            │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │  Upload  │  │ Method Select │  │   Results Comparison    │   │
│  └──────────┘  └──────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Processing Pipeline                         │
│                                                                  │
│  ┌────────────────┐                                             │
│  │ PDF Ingestion  │──▶ Extract metadata, render pages           │
│  └────────────────┘                                             │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Parallel Processing Branches                   │ │
│  │                                                             │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │ │
│  │  │  VLM    │  │  OCR +  │  │ Layout  │  │ Symbol  │       │ │
│  │  │ Direct  │  │  Parse  │  │ Analysis│  │ Detect  │       │ │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────┐                                             │
│  │ Results Store  │──▶ Metrics, outputs, timing                 │
│  └────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack Recommendation

### Backend
- **Python 3.11+** with FastAPI
- **Celery** or **Dramatiq** for async task processing
- **Redis** for task queue and caching
- **SQLite** or **PostgreSQL** for results storage

### Frontend
- **React** or **Svelte** (lightweight)
- **TailwindCSS** for styling
- **PDF.js** for client-side preview

### ML Infrastructure
- **vLLM** or **Ollama** for serving VLMs locally
- **Hugging Face Transformers** for model loading
- **ONNX Runtime** for optimized inference (optional)

### Containerization
- **Docker Compose** for local development
- GPU passthrough for inference containers

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Deliverables:**
- [ ] Project scaffolding (FastAPI + React)
- [ ] PDF upload and storage
- [ ] Basic PDF rendering (page images)
- [ ] Metadata extraction pipeline
- [ ] Simple results database schema

**Key files:**
```
/backend
  /app
    main.py
    /routers
      upload.py
      process.py
      results.py
    /services
      pdf_service.py
    /models
      schemas.py
/frontend
  /src
    App.jsx
    /components
      Upload.jsx
      Viewer.jsx
```

### Phase 2: OCR Pipeline (Week 2-3)

**Deliverables:**
- [ ] Integrate PaddleOCR
- [ ] Integrate Tesseract
- [ ] Integrate Surya
- [ ] Text extraction with bounding boxes
- [ ] Side-by-side comparison view

**Evaluation metrics:**
- Character accuracy
- Word accuracy  
- Processing time
- Bounding box precision

### Phase 3: VLM Integration (Week 3-4)

**Deliverables:**
- [ ] Ollama setup with Qwen2-VL or LLaVA
- [ ] Prompt templates for construction drawings
- [ ] Structured output parsing (JSON mode)
- [ ] Multi-page document handling

**Test prompts to develop:**
- "List all room names and their dimensions"
- "Identify the title block information"
- "Describe the electrical layout"
- "Extract the revision history"
- "What scale is this drawing?"

### Phase 4: Layout & Symbol Detection (Week 4-5)

**Deliverables:**
- [ ] LayoutLMv3 integration for structure
- [ ] YOLOv8 setup for symbol detection
- [ ] Grounding DINO for open-vocabulary queries
- [ ] Visual annotation overlay

**Detection targets:**
- Doors, windows, walls
- Electrical symbols (outlets, switches, panels)
- Plumbing fixtures
- Dimension lines and callouts
- Section markers and detail references

### Phase 5: Comparison Dashboard (Week 5-6)

**Deliverables:**
- [ ] Unified results schema
- [ ] Performance metrics dashboard
- [ ] Accuracy comparison charts
- [ ] Export functionality (JSON, CSV)
- [ ] Annotation review interface

---

## 6. Evaluation Framework

### Quantitative Metrics

| Metric | Description |
|--------|-------------|
| **Latency** | Time to process single page |
| **Throughput** | Pages per minute |
| **Text Accuracy** | Levenshtein distance from ground truth |
| **Detection mAP** | For symbol/object detection |
| **Extraction Recall** | % of key fields correctly extracted |

### Qualitative Evaluation

- Handling of low-quality scans
- Performance on hand-drawn vs. CAD drawings
- Ability to follow cross-references
- Understanding of scale and dimensions
- Symbol interpretation accuracy

### Test Dataset Categories

1. **Architectural floor plans** - rooms, doors, windows
2. **Electrical schematics** - symbols, circuits, panels  
3. **Structural drawings** - beams, columns, foundations
4. **MEP (Mechanical/Electrical/Plumbing)** - mixed systems
5. **Site plans** - outdoor layouts, grading
6. **Detail sheets** - zoomed construction details

---

## 7. Quick Start Commands

```bash
# Clone and setup
git clone <repo>
cd construction-vision

# Backend setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install Ollama and pull a VLM
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2-vl:7b

# Start services
docker-compose up -d redis
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## 8. Key Dependencies

```txt
# requirements.txt
fastapi>=0.109.0
uvicorn[standard]
python-multipart
pymupdf>=1.23.0
pdf2image
pdfplumber
pillow

# OCR
paddleocr
easyocr
pytesseract
surya-ocr

# ML/Vision
torch>=2.0
transformers
accelerate
ollama
vllm  # optional, for faster inference

# Utilities
celery[redis]
sqlalchemy
pydantic>=2.0
```

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| GPU memory constraints | Use quantized models (4-bit), batch processing |
| Slow inference | Implement caching, async processing with progress |
| Variable PDF quality | Pre-processing pipeline (deskew, denoise, enhance) |
| Model hallucination | Confidence scoring, human review interface |
| Large file handling | Chunked upload, page-by-page processing |

---

## 10. Future Extensions

Once the baseline system works:

1. **Fine-tuning pipeline** - Train on labeled construction drawings
2. **RAG integration** - Query drawings with natural language
3. **Drawing comparison** - Diff between revisions
4. **3D correlation** - Link 2D drawings to BIM models
5. **PDFH integration** - Test your format with embedded metadata

---

## Next Steps

1. Set up the project repository
2. Choose initial VLM (recommend starting with Qwen2-VL 7B via Ollama)
3. Gather 10-20 sample construction drawings across categories
4. Build the upload + basic extraction pipeline
5. Iterate based on initial results

Would you like me to scaffold the initial codebase?
