"""
SkillLens AI — Gamification Service (PRD Part 16)

Manages:
- Idempotent growth points
- Milestone badges (FIRST_ASSESSMENT, QUIZ_MASTER, GAP_CLOSER, CONSISTENT_LEARNER, COMPETENCY_MASTER, PATH_COMPLETED)
- Prevents duplicate rewards using unique idempotent event keys
"""
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import Learner, LearnerPoint, Badge, LearnerBadge, LearnerCompetencyScore

DEFAULT_BADGES = [
    {
        "code": "FIRST_ASSESSMENT",
        "name": "First Step",
        "description": "Completed your first verified skill assessment on SkillLens AI.",
        "icon": "award",
        "min_points": 10,
    },
    {
        "code": "QUIZ_MASTER",
        "name": "Proficiency Champion",
        "description": "Scored 90% or higher on an official competency assessment.",
        "icon": "zap",
        "min_points": 30,
    },
    {
        "code": "GAP_CLOSER",
        "name": "Gap Closer",
        "description": "Successfully elevated a critical cadre deficit to official benchmark level.",
        "icon": "shield-check",
        "min_points": 50,
    },
    {
        "code": "CONSISTENT_LEARNER",
        "name": "Cadre Exemplar",
        "description": "Earned over 100 growth points across continuous capacity building.",
        "icon": "sparkles",
        "min_points": 100,
    },
    {
        "code": "COMPETENCY_MASTER",
        "name": "Domain Authority",
        "description": "Demonstrated Level 4.0+ mastery in an official statistical competency.",
        "icon": "star",
        "min_points": 120,
    },
    {
        "code": "PATH_COMPLETED",
        "name": "Pathway Graduate",
        "description": "Completed all sequential learning units in your assigned cadre pathway.",
        "icon": "graduation-cap",
        "min_points": 80,
    },
]


def ensure_badges_seeded(db: Session):
    """Ensures standard badge definitions exist in DB."""
    for b in DEFAULT_BADGES:
        existing = db.query(Badge).filter(Badge.code == b["code"]).first()
        if not existing:
            badge = Badge(
                code=b["code"],
                name=b["name"],
                description=b["description"],
                icon=b["icon"],
                min_points=b["min_points"],
            )
            db.add(badge)
    db.commit()


def award_points_for_event(
    db: Session,
    learner_id: str,
    event_type: str,
    points: int,
    description: str,
    idempotent_suffix: Optional[str] = None,
) -> Optional[LearnerPoint]:
    """
    Awards growth points idempotently.
    If the event key already exists, returns None without creating a duplicate.
    """
    key = f"{learner_id}_{event_type}_{idempotent_suffix or datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    existing = db.query(LearnerPoint).filter(LearnerPoint.idempotent_key == key).first()
    if existing:
        return existing

    lp = LearnerPoint(
        learner_id=learner_id,
        event_type=event_type,
        points=points,
        idempotent_key=key,
        description=description,
        created_at=datetime.utcnow(),
    )
    db.add(lp)
    db.commit()
    db.refresh(lp)
    return lp


def check_and_award_badges(db: Session, learner_id: str) -> List[Badge]:
    """
    Evaluates learner milestones and unlocks unearned badges.
    """
    ensure_badges_seeded(db)
    
    # Compute total points
    points_records = db.query(LearnerPoint).filter(LearnerPoint.learner_id == learner_id).all()
    total_points = sum(p.points for p in points_records)

    # Check earned badges
    earned_badge_ids = {
        b.badge_id for b in db.query(LearnerBadge).filter(LearnerBadge.learner_id == learner_id).all()
    }

    newly_awarded = []
    all_badges = db.query(Badge).all()

    for badge in all_badges:
        if badge.id in earned_badge_ids:
            continue

        should_award = False
        if badge.code == "FIRST_ASSESSMENT" and len(points_records) >= 1:
            should_award = True
        elif badge.code == "CONSISTENT_LEARNER" and total_points >= badge.min_points:
            should_award = True
        elif badge.code == "GAP_CLOSER":
            has_closed = any(p.event_type == "GAP_CLOSED" for p in points_records)
            if has_closed:
                should_award = True
        elif badge.code == "COMPETENCY_MASTER":
            high_scores = (
                db.query(LearnerCompetencyScore)
                .filter(LearnerCompetencyScore.learner_id == learner_id, LearnerCompetencyScore.current_level >= 4.0)
                .count()
            )
            if high_scores > 0:
                should_award = True
        elif badge.code == "QUIZ_MASTER":
            has_mastered = any(p.event_type == "QUIZ_MASTER" or (p.points >= 30 and "90" in (p.description or "")) for p in points_records)
            if has_mastered:
                should_award = True
        elif total_points >= badge.min_points and badge.min_points > 0:
            should_award = True

        if should_award:
            key = f"{learner_id}_{badge.code}"
            lb = LearnerBadge(
                learner_id=learner_id,
                badge_id=badge.id,
                idempotent_key=key,
                awarded_at=datetime.utcnow(),
            )
            db.add(lb)
            newly_awarded.append(badge)

    db.commit()
    return newly_awarded


def get_learner_gamification_summary(db: Session, learner_id: str) -> Dict[str, Any]:
    """Returns total points, history, and badges status."""
    ensure_badges_seeded(db)
    points_records = (
        db.query(LearnerPoint)
        .filter(LearnerPoint.learner_id == learner_id)
        .order_by(LearnerPoint.created_at.desc())
        .all()
    )
    total_points = sum(p.points for p in points_records)

    all_badges = db.query(Badge).all()
    earned_records = {
        b.badge_id: b.awarded_at
        for b in db.query(LearnerBadge).filter(LearnerBadge.learner_id == learner_id).all()
    }

    badges_out = []
    for b in all_badges:
        is_earned = b.id in earned_records
        badges_out.append({
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "description": b.description,
            "icon": b.icon,
            "min_points": b.min_points,
            "awarded": is_earned,
            "awarded_at": earned_records[b.id].isoformat() if is_earned else None,
        })

    return {
        "total_points": total_points,
        "history": [
            {
                "event_type": p.event_type,
                "points": p.points,
                "description": p.description,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in points_records[:20]
        ],
        "badges": badges_out,
    }
