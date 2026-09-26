"""
scripts/seed_aditi_mospi.py
Ensures aditi.sharma@mospi.gov.in and admin accounts exist with expected passwords and data.
"""
from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import (
    Learner, Position, Competency, LearnerCompetencyScore,
    LearnerTopicMastery, CompetencyEvidence, LearningPathStep,
    Badge, LearnerBadge, LearnerPoint
)

def seed_mospi_accounts():
    db = SessionLocal()
    try:
        jso_pos = db.query(Position).filter(Position.title == "Junior Statistical Officer").first()

        # 1. Aditi Sharma (aditi.sharma@mospi.gov.in)
        aditi_mospi = db.query(Learner).filter(Learner.email == "aditi.sharma@mospi.gov.in").first()
        if not aditi_mospi:
            aditi_mospi = Learner(
                name="Aditi Sharma",
                email="aditi.sharma@mospi.gov.in",
                hashed_password=hash_password("mospi1234"),
                position_id=jso_pos.id if jso_pos else None,
                qualification="Bachelors in Statistics",
                experience_years=1.5,
                is_admin=False,
                onboarding_completed=True,
                career_goal="I want to lead national survey design and master statistical sampling methods.",
                goal_timeline_months=12,
                learning_preference="guided",
                login_count=5,
                last_login_at=datetime.utcnow(),
            )
            db.add(aditi_mospi)
            db.commit()
            db.refresh(aditi_mospi)
            print(f"Created aditi.sharma@mospi.gov.in (ID: {aditi_mospi.id})")
        else:
            aditi_mospi.hashed_password = hash_password("mospi1234")
            aditi_mospi.onboarding_completed = True
            if jso_pos:
                aditi_mospi.position_id = jso_pos.id
            db.commit()
            print(f"Updated aditi.sharma@mospi.gov.in password and position")

        # Copy competency scores from aditi.demo@skilllens.in if available
        aditi_demo = db.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
        if aditi_demo and aditi_mospi:
            # Check existing scores for mospi
            existing_scores = db.query(LearnerCompetencyScore).filter(
                LearnerCompetencyScore.learner_id == aditi_mospi.id
            ).all()
            if not existing_scores:
                demo_scores = db.query(LearnerCompetencyScore).filter(
                    LearnerCompetencyScore.learner_id == aditi_demo.id
                ).all()
                for ds in demo_scores:
                    ns = LearnerCompetencyScore(
                        learner_id=aditi_mospi.id,
                        competency_id=ds.competency_id,
                        current_level=ds.current_level,
                        confidence=getattr(ds, 'confidence', 0.85),
                        mastery_probability=getattr(ds, 'mastery_probability', 0.75),
                        ability_theta=getattr(ds, 'ability_theta', 3.0),
                        questions_asked=getattr(ds, 'questions_asked', 10),
                        last_updated=datetime.utcnow()
                    )
                    db.add(ns)
                db.commit()
                print(f"Copied {len(demo_scores)} competency scores to aditi.sharma@mospi.gov.in")

        # 2. Admin Accounts
        admin_accounts = [
            ("Training Administrator", "admin.demo@skilllens.in", "admin1234"),
            ("National Cadre Administrator", "admin@mospi.gov.in", "admin1234"),
        ]
        for name, email, pwd in admin_accounts:
            adm = db.query(Learner).filter(Learner.email == email).first()
            if not adm:
                adm = Learner(
                    name=name,
                    email=email,
                    hashed_password=hash_password(pwd),
                    is_admin=True,
                    onboarding_completed=True,
                    qualification="Senior Administrative Director",
                    experience_years=15.0,
                    position_id=jso_pos.id if jso_pos else None,
                )
                db.add(adm)
                db.commit()
                print(f"Created admin account {email}")
            else:
                adm.is_admin = True
                adm.hashed_password = hash_password(pwd)
                db.commit()
                print(f"Updated admin account {email}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_mospi_accounts()
