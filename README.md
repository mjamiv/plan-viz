# Construction Vision

Evaluation harness for AI vision methods on construction drawing PDFs. Compare OCR providers, VLMs, layout analysis, and object detection side-by-side.

## Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        Upload[Upload Component]
        Viewer[Viewer Component]
        Compare[Comparison Component]
        Dashboard[Dashboard Component]
        Review[Annotation Review]
    end

    subgraph Backend["Backend (FastAPI)"]
        API[API Routes]
        subgraph Services
            PDF[PDF Service]
            OCR[OCR Service]
            VLM[VLM Service]
            Layout[Layout Service]
            Detect[Detection Service]
        end
        Metrics[Metrics Router]
        DB[(SQLite)]
        Files[File Storage]
    end

    subgraph External["External Services"]
        Ollama[Ollama VLM]
        Models[ML Models]
    end

    Upload --> API
    Viewer --> API
    Compare --> API
    Dashboard --> Metrics
    Review --> API

    API --> PDF
    API --> OCR
    API --> VLM
    API --> Layout
    API --> Detect
    API --> DB
    API --> Files

    VLM --> Ollama
    Layout --> Models
    Detect --> Models
```

## Processing Pipeline

```mermaid
flowchart LR
    subgraph Input
        PDF[PDF Upload]
    end

    subgraph Processing
        Render[Render Pages]

        subgraph Parallel["Parallel Analysis"]
            OCR[OCR\nTesseract/PaddleOCR/Surya/EasyOCR]
            VLM[VLM\nQwen2-VL via Ollama]
            Layout[Layout\nLayoutLMv3]
            Detect[Detection\nYOLOv8/Grounding DINO]
        end
    end

    subgraph Output
        Results[Results + Metrics]
        Export[Export CSV/JSON]
    end

    PDF --> Render
    Render --> OCR
    Render --> VLM
    Render --> Layout
    Render --> Detect
    OCR --> Results
    VLM --> Results
    Layout --> Results
    Detect --> Results
    Results --> Export
```

## Data Model

```mermaid
erDiagram
    Document ||--o{ ProcessRun : has
    Document {
        int id PK
        string filename
        string stored_path
        datetime uploaded_at
        int page_count
        text metadata_json
    }
    ProcessRun {
        int id PK
        int document_id FK
        string stage
        string status
        datetime started_at
        datetime finished_at
        text output_json
    }
```

## UI Tabs

```mermaid
graph LR
    subgraph Tabs
        V[Viewer]
        C[Compare OCR]
        D[Dashboard]
        R[Review]
    end

    V --> V1[Page previews]
    V --> V2[Run list]
    V --> V3[Overlay boxes]
    V --> V4[Export links]

    C --> C1[Provider selection]
    C --> C2[Summary table]
    C --> C3[Side-by-side text]

    D --> D1[Metrics cards]
    D --> D2[Provider tables]
    D --> D3[Bar charts]

    R --> R1[Annotation list]
    R --> R2[Filter/search]
    R --> R3[Click to highlight]
```

## Quick Start

### Backend

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Ollama (for VLM)

```bash
ollama pull qwen2-vl:7b
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload/` | Upload PDF |
| POST | `/process/{id}` | Render pages |
| POST | `/ocr/{id}` | Run OCR |
| POST | `/vlm/{id}` | Run VLM |
| POST | `/layout/{id}` | Run layout analysis |
| POST | `/detect/{id}` | Run detection |
| GET | `/results/{id}` | Get all runs |
| GET | `/metrics/{id}` | Get unified metrics |
| GET | `/metrics/{id}/compare/{stage}` | Compare providers |
| GET | `/results/{id}/export.csv` | Export CSV |
| GET | `/results/{id}/export.json` | Export JSON |

## Supported Providers

### OCR
- **Tesseract** - Classic OCR with LSTM engine
- **PaddleOCR** - Fast, accurate, good CJK support
- **EasyOCR** - Simple API, 80+ languages
- **Surya** - Modern, layout-aware

### VLM
- **Qwen2-VL** (via Ollama) - Multi-page support with `max_pages` option

### Layout
- **LayoutLMv3** - Document structure understanding

### Detection
- **YOLOv8** - Fast object detection
- **Grounding DINO** - Open-vocabulary detection

## Environment Variables

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | API base URL |
| `VITE_BASE` | Vite base path (e.g., `/plan-viz/` for GitHub Pages) |

### Backend
| Variable | Description |
|----------|-------------|
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `LAYOUTLMV3_MODEL` | LayoutLMv3 model name |
| `GROUNDING_DINO_MODEL` | Grounding DINO model name |
| `YOLO_MODEL_PATH` | YOLOv8 model path |
| `RESULTS_RETENTION_DAYS` | Auto-cleanup for old artifacts |

## Project Structure

```
plan-viz/
├── backend/
│   └── app/
│       ├── main.py
│       ├── db.py
│       ├── models.py
│       ├── schemas.py
│       ├── routers/
│       │   ├── upload.py
│       │   ├── process.py
│       │   ├── ocr.py
│       │   ├── vlm.py
│       │   ├── layout.py
│       │   ├── detect.py
│       │   ├── results.py
│       │   └── metrics.py
│       ├── services/
│       │   ├── pdf_service.py
│       │   ├── ocr_service.py
│       │   ├── vlm_service.py
│       │   ├── layout_service.py
│       │   └── detection_service.py
│       └── data/
│           ├── uploads/
│           ├── pages/
│           └── results/
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── Upload.jsx
            ├── Viewer.jsx
            ├── Comparison.jsx
            ├── Dashboard.jsx
            └── AnnotationReview.jsx
```

## Development Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant M as ML Models

    U->>F: Upload PDF
    F->>B: POST /upload
    B-->>F: Document metadata

    U->>F: Click "Render Pages"
    F->>B: POST /process/{id}
    B-->>F: Page images

    U->>F: Select OCR provider
    F->>B: POST /ocr/{id}
    B->>M: Run OCR
    M-->>B: Words + boxes
    B-->>F: Run result

    U->>F: Switch to Dashboard tab
    F->>B: GET /metrics/{id}
    B-->>F: Unified metrics

    U->>F: Export results
    F->>B: GET /export.csv
    B-->>F: CSV download
```

## Notes

- `pdf2image` requires Poppler on your system
- Page images served from `/files` endpoint
- Run outputs persisted as JSON in `backend/app/data/results`
- Frontend is a static Vite app suitable for GitHub Pages
- Backend requires separate hosting (GPU optional but recommended)
