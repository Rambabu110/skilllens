"""
Advanced feature #2: Cohort Analytics.

A single learner's dashboard reads as a personal app. Aggregating gaps
across every learner in a position/department is what makes this an
institutional capability-building tool -- directly answers the "scale
of impact" SIH judging criterion instead of just "user experience".
"""
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.models import Learner, Position
from app.services.competency import compute_gaps


def cohort_overview(db: Session) -> dict:
    positions = db.query(Position).all()
    overview = []

    total_critical = 0
    total_learners = 0

    for position in positions:
        learners = db.query(Learner).filter(Learner.position_id == position.id).all()
        if not learners:
            continue

        competency_gap_totals = defaultdict(lambda: {"name": "", "type": "", "critical_count": 0, "total_gap": 0.0})

        for learner in learners:
            gaps = compute_gaps(db, learner)
            for g in gaps:
                bucket = competency_gap_totals[g["competency_id"]]
                bucket["name"] = g["competency_name"]
                bucket["type"] = g["competency_type"]
                bucket["total_gap"] += max(g["gap_size"], 0)
                if g["status"] == "critical":
                    bucket["critical_count"] += 1
                    total_critical += 1

        total_learners += len(learners)

        ranked = sorted(
            [{"competency_id": k, **v, "avg_gap": round(v["total_gap"] / len(learners), 2)}
             for k, v in competency_gap_totals.items()],
            key=lambda c: -c["avg_gap"],
        )

        overview.append({
            "position_id": position.id,
            "position_title": position.title,
            "department": position.department,
            "learner_count": len(learners),
            "top_gaps": ranked[:5],
        })

    return {
        "total_learners": total_learners,
        "total_critical_gaps": total_critical,
        "positions": overview,
    }
