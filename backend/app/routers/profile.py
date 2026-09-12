from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner, Position, Competency
from app.schemas.schemas import PositionOut, CompetencyScoreOut
from app.services.competency import ensure_competency_scores, get_required_competencies_for_learner
from app.ml.explain import explain_prediction

router = APIRouter(tags=["profile"])


@router.get("/positions", response_model=list[PositionOut])
def list_positions(db: Session = Depends(get_db)):
    return db.query(Position).all()


@router.get("/competency/profile", response_model=list[CompetencyScoreOut])
def get_competency_profile(
    current: Learner = Depends(get_current_learner), db: Session = Depends(get_db)
):
    scores = ensure_competency_scores(db, current)
    required = {c.id: c for c in get_required_competencies_for_learner(db, current)}

    out = []
    for s in scores:
        comp = required.get(s.competency_id)
        if not comp:
            continue
        out.append(CompetencyScoreOut(
            competency_id=comp.id,
            competency_name=comp.name,
            competency_type=comp.type.value if hasattr(comp.type, "value") else comp.type,
            required_level=comp.required_level,
            current_level=s.current_level,
            confidence=s.confidence,
            mastery_probability=round(float(s.mastery_probability or 0.3), 4),
        ))
    return out


@router.get("/competency/explain")
def explain_my_score(current: Learner = Depends(get_current_learner)):
    """
    Explainable AI (SHAP): breaks down exactly which factors pushed this
    learner's predicted competency level up or down, and by how much.
    Only meaningful when the learner has a real behavioral feature vector
    (demo personas, or learners with enough platform activity) -- for
    brand-new learners on the heuristic fallback, this says so plainly
    instead of fabricating an explanation for a non-ML estimate.
    """
    if not current.behavioral_features:
        return {
            "explainable": False,
            "reason": "This learner is on the heuristic fallback (no platform activity "
                      "history yet), so there's no ML prediction to explain. Once real "
                      "engagement/assessment data exists, this becomes a live SHAP breakdown.",
        }
    breakdown = explain_prediction(current.behavioral_features)
    return {"explainable": True, **breakdown}

