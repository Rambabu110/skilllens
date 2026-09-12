"""
Phase 7 — seed 3 demo personas across different positions/experience
levels so the live demo immediately shows varied gap profiles, instead
of judges seeing one empty account.

Each demo learner is also assigned a REAL feature vector sampled from
the OULAD-derived training_features.csv (one low performer, one mid,
one high) -- their "behavioral twin" -- so the app runs the actual
trained model + SHAP explainer live in the demo, not the fallback
heuristic. This is disclosed honestly: it's a real student's real
engagement/assessment pattern standing in for a not-yet-existing
platform history, not fabricated data.

Run after seed_data.py:  python scripts/seed_demo_learners.py
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import Learner, Position

FEATURES_PATH = Path(__file__).resolve().parent.parent / "data" / "training_features.csv"
FEATURE_COLS = [
    "total_clicks", "engagement_index", "active_days",
    "avg_assessment_score", "num_assessments",
    "num_of_prev_attempts", "studied_credits",
]


def sample_behavioral_twin(df: pd.DataFrame, band: str) -> dict:
    """Pick one real OULAD student row matching a rough performance band."""
    if band == "low":
        row = df[df.competency_level <= 1.5].sample(1, random_state=1).iloc[0]
    elif band == "mid":
        row = df[(df.competency_level > 2.5) & (df.competency_level < 3.8)].sample(1, random_state=2).iloc[0]
    else:
        row = df[df.competency_level >= 4.5].sample(1, random_state=3).iloc[0]
    return {c: float(row[c]) for c in FEATURE_COLS}


DEMO_LEARNERS = [
    {
        "name": "Aditi Sharma",
        "email": "aditi.demo@skilllens.in",
        "password": "demo1234",
        "position_title": "Junior Statistical Officer",
        "qualification": "Bachelors in Statistics",
        "experience_years": 1,
        "band": "low",
    },
    {
        "name": "Rohan Verma",
        "email": "rohan.demo@skilllens.in",
        "password": "demo1234",
        "position_title": "Data Analyst (Statistical System)",
        "qualification": "Masters in Data Science",
        "experience_years": 4,
        "band": "mid",
    },
    {
        "name": "Kavita Nair",
        "email": "kavita.demo@skilllens.in",
        "password": "demo1234",
        "position_title": "Survey Supervisor",
        "qualification": "Bachelors in Economics",
        "experience_years": 7,
        "band": "high",
    },
]


def run():
    df = pd.read_csv(FEATURES_PATH) if FEATURES_PATH.exists() else None
    db = SessionLocal()
    try:
        for entry in DEMO_LEARNERS:
            if db.query(Learner).filter(Learner.email == entry["email"]).first():
                continue
            position = db.query(Position).filter(Position.title == entry["position_title"]).first()
            features = sample_behavioral_twin(df, entry["band"]) if df is not None else None
            learner = Learner(
                name=entry["name"],
                email=entry["email"],
                hashed_password=hash_password(entry["password"]),
                position_id=position.id if position else None,
                qualification=entry["qualification"],
                experience_years=entry["experience_years"],
                behavioral_features=features,
            )
            db.add(learner)

        # Training-administrator demo account (cohort analytics view)
        if not db.query(Learner).filter(Learner.email == "admin.demo@skilllens.in").first():
            db.add(Learner(
                name="Training Administrator",
                email="admin.demo@skilllens.in",
                hashed_password=hash_password("admin1234"),
                is_admin=True,
            ))

        db.commit()
        print("Demo learners ready (with real OULAD-sampled behavioral twins). Login with any of:")
        for e in DEMO_LEARNERS:
            print(f"  {e['email']} / {e['password']}")
        print("  admin.demo@skilllens.in / admin1234  (training administrator / cohort view)")
    finally:
        db.close()


if __name__ == "__main__":
    run()
