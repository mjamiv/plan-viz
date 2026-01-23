import datetime as dt
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class DocumentCreate(BaseModel):
    filename: str
    stored_path: str
    page_count: int = 0
    metadata: Optional[Dict[str, Any]] = None


class DocumentOut(BaseModel):
    id: int
    filename: str
    stored_path: str
    uploaded_at: dt.datetime
    page_count: int
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ProcessRunOut(BaseModel):
    id: int
    document_id: int
    stage: str
    status: str
    started_at: dt.datetime
    finished_at: Optional[dt.datetime]
    output: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class DocumentResultsOut(BaseModel):
    document: DocumentOut
    runs: List[ProcessRunOut]


class OcrRequest(BaseModel):
    provider: str = "tesseract"


class VlmRequest(BaseModel):
    prompt_key: str
    model: str = "gpt-4o"
    provider: str = "openai"  # "openai" or "ollama"
    api_key: Optional[str] = None  # Required for OpenAI
    max_pages: Optional[int] = None
    custom_prompt: Optional[str] = None  # Required when prompt_key is "custom"


class LayoutRequest(BaseModel):
    provider: str = "layoutlmv3"


class DetectionRequest(BaseModel):
    provider: str = "yolov8"
    targets: Optional[List[str]] = None
