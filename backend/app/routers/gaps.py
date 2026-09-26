from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner
from app.schemas.schemas import GapItem
from app.services.competency import compute_gaps
from app.services.trajectory import estimate_weeks_to_close

router = APIRouter(prefix="/gaps", tags=["gaps"])


@router.get("", response_model=list[GapItem])
def get_my_gaps(current: Learner = Depends(get_current_learner), db: Session = Depends(get_db)):
    return compute_gaps(db, current)


@router.get("/trajectory")
def get_gap_trajectories(current: Learner = Depends(get_current_learner), db: Session = Depends(get_db)):
    """
    Heuristic, transparently-labeled projection of when each critical/
    developing gap would close at the learner's recent quiz-improvement
    rate. See services/trajectory.py for the exact (simple) method.
    """
    gaps = compute_gaps(db, current)
    out = []
    for g in gaps:
        if g["status"] == "strength":
            continue
        forecast = estimate_weeks_to_close(db, current.id, g["gap_size"])
        out.append({**g, "forecast": forecast})
    return out


@router.get("/graph")
def get_gap_prereq_graph(current: Learner = Depends(get_current_learner), db: Session = Depends(get_db)):
    """
    Prerequisite knowledge graph (DAG) representing dependencies and root gaps for learner's cadre.
    """
    from app.services.competency import get_prereq_subgraph
    return get_prereq_subgraph(db, current)


@router.get("/topics/{competency_id}")
def get_competency_topics(
    competency_id: str,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """
    Returns the topic-level mastery breakdown and BKT estimates for a specific competency.
    """
    from app.models.models import Topic, LearnerTopicMastery
    topics = db.query(Topic).filter(Topic.competency_id == competency_id).all()
    out = []
    for t in topics:
        mastery = (
            db.query(LearnerTopicMastery)
            .filter(LearnerTopicMastery.learner_id == current.id, LearnerTopicMastery.topic_id == t.id)
            .first()
        )
        out.append({
            "topic_id": t.id,
            "topic_name": t.name,
            "competency_id": t.competency_id,
            "mastery_probability": round(mastery.mastery_probability, 4) if mastery else 0.30,
            "attempts": mastery.attempts if mastery else 0,
            "correct": mastery.correct if mastery else 0,
            "confidence": round(mastery.confidence, 2) if mastery else 0.40,
            "last_assessed": mastery.last_assessed.isoformat() if (mastery and mastery.last_assessed) else None,
        })
    return out


@router.get("/evidence")
def get_all_competency_evidence(
    competency_id: str = None,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """
    Returns chronological competency evidence trail verifying all level advancements.
    """
    from app.services.evidence_service import get_learner_competency_evidence_history
    return get_learner_competency_evidence_history(db, current.id, competency_id=competency_id)


