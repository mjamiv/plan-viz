import datetime as dt
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from .db import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False, unique=True)
    uploaded_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)
    page_count = Column(Integer, default=0, nullable=False)
    metadata_json = Column(Text, nullable=True)

    runs = relationship("ProcessRun", back_populates="document", cascade="all, delete-orphan")


class ProcessRun(Base):
    __tablename__ = "process_runs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    stage = Column(String, nullable=False)
    status = Column(String, nullable=False)
    started_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    output_json = Column(Text, nullable=True)

    document = relationship("Document", back_populates="runs")
