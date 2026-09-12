from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.routers import auth, profile, gaps, recommendations, quiz, mock_igot, admin, export, viva

# Import models so SQLAlchemy knows about them before create_all
from app.models import models  # noqa: F401

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(gaps.router)
app.include_router(recommendations.router)
app.include_router(quiz.router)
app.include_router(viva.router)
app.include_router(mock_igot.router)
app.include_router(admin.router)
app.include_router(export.router)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "note": "iGOT Karmayogi integration is simulated via /mock-igot/* "
                "(no public iGOT API exists). ML competency model is trained "
                "on real OULAD data. Quiz generation calls a real LLM.",
        "docs": "/docs",
    }
