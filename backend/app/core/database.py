import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError

from app.core.config import settings, using_sqlite

logger = logging.getLogger("Database")

connect_args = {"check_same_thread": False} if using_sqlite() else {}

try:
    engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
    # Quick connectivity probe
    with engine.connect() as conn:
        pass
except (OperationalError, Exception) as e:
    logger.warning(f"[Database] Primary DATABASE_URL connection failed ({e}). Falling back to local SQLite: sqlite:///./skilllens.db")
    engine = create_engine("sqlite:///./skilllens.db", connect_args={"check_same_thread": False}, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

