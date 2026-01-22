import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, ENGINE
from .routers import detect, layout, metrics, ocr, process, results, upload, vlm
from .services import pdf_service


def _ensure_data_dir() -> None:
    base_dir = os.path.join(os.path.dirname(__file__), "data")
    dirs = pdf_service.ensure_dirs(os.path.abspath(base_dir))
    retention = os.getenv("RESULTS_RETENTION_DAYS")
    if retention:
        try:
            max_age_days = int(retention)
        except ValueError:
            max_age_days = 0
        if max_age_days > 0:
            pdf_service.cleanup_results(dirs["results"], max_age_days)


def create_app() -> FastAPI:
    _ensure_data_dir()
    Base.metadata.create_all(bind=ENGINE)
    app = FastAPI(title="Construction Vision API")
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    app.mount("/files", StaticFiles(directory=os.path.abspath(data_dir)), name="files")
    allow_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
    ).split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in allow_origins if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(upload.router)
    app.include_router(process.router)
    app.include_router(ocr.router)
    app.include_router(vlm.router)
    app.include_router(layout.router)
    app.include_router(detect.router)
    app.include_router(results.router)
    app.include_router(metrics.router)
    return app


app = create_app()
