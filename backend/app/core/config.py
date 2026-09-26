"""
Central settings. All environment-specific values come from .env so the
SAME code runs against local SQLite (dev/testing here) or Supabase
Postgres (real deployment) with zero code changes.
"""
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Database ---
    # Local default: SQLite file, zero setup.
    # Supabase: set DATABASE_URL to the Supabase "connection string"
    # (Project Settings -> Database -> Connection string -> URI, using the
    # "Transaction" pooler string is recommended for serverless/short-lived
    # connections). Example:
    # postgresql+psycopg2://postgres:<password>@<project>.supabase.co:5432/postgres
    DATABASE_URL: str = "sqlite:///./skilllens.db"

    # --- Supabase (optional; only needed if using Supabase Auth/Storage
    # instead of just its Postgres DB) ---
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_KEY: str | None = None

    # --- Auth ---
    JWT_SECRET: str = "skilllens-jwt-secret-key-production-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h, fine for a demo
    ADMIN_EMAILS: list[str] = [
        "geneewoan@gmail.com",
        "admin@skilllens.in",
        "admin.demo@skilllens.in",
        "ramm205061@gmail.com",
    ]

    # --- Firebase Admin ---
    FIREBASE_PROJECT_ID: str = "skilllenss"

    # --- LLM ---
    # Provider abstraction lives in app/services/llm.py so switching
    # Gemini <-> OpenAI later is a one-file change, not a rewrite.
    LLM_PROVIDER: str = "gemini"  # or "openai"
    GEMINI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None

    # --- App ---
    APP_NAME: str = "SkillLens AI"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


def using_sqlite() -> bool:
    return settings.DATABASE_URL.startswith("sqlite")


def is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    normalized = email.strip().lower()
    return normalized in [e.lower() for e in settings.ADMIN_EMAILS]

