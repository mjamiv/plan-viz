import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, ENGINE
from .routers import detect, layout, ocr, process, results, upload, vlm
from .services import pdf_service


def _ensure_data_dir() -> None:
    base_dir = os.path.join(os.path.dirname(__file__), "data")
    pdf_service.ensure_dirs(os.path.abspath(base_dir))


def create_app() -> FastAPI:
    _ensure_data_dir()
    Base.metadata.create_all(bind=ENGINE)
    app = FastAPI(title="Construction Vision API")
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    app.mount("/files", StaticFiles(directory=os.path.abspath(data_dir)), name="files")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
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
    return app


app = create_app()
