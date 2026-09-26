from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.routers import (
    auth, profile, gaps, recommendations, quiz, mock_igot,
    admin, export, viva, learning_path, gamification,
    notifications, certificate, diagnostic,
)


# Import models so SQLAlchemy knows about them before create_all
from app.models import models  # noqa: F401

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|.*\.vercel\.app|.*\.onrender\.com)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        from app.models.models import Position
        from app.core.database import SessionLocal
        with SessionLocal() as db:
            if db.query(Position).count() == 0:
                print("[Startup] Empty database detected on fresh deployment. Seeding initial FRAC demo data...")
                from scripts.seed_comprehensive_demo import seed_all
                seed_all()
    except Exception as e:
        print(f"[Startup Seed Notice]: {e}")


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(gaps.router)
app.include_router(recommendations.router)
app.include_router(quiz.router)
app.include_router(viva.router)
app.include_router(mock_igot.router)
app.include_router(admin.router)
app.include_router(export.router)
app.include_router(learning_path.router)
app.include_router(gamification.router)
app.include_router(notifications.router)
app.include_router(certificate.router)
app.include_router(diagnostic.router)


@app.get("/healthz")
@app.get("/health")
def healthz():
    return {"status": "ok", "app": settings.APP_NAME}


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
