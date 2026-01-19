import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


def _database_url() -> str:
    default_path = os.path.join(os.path.dirname(__file__), "data", "app.db")
    return os.getenv("DATABASE_URL", f"sqlite:///{default_path}")


ENGINE = create_engine(
    _database_url(),
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
