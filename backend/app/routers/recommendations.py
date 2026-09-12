from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner
from app.schemas.schemas import RecommendationItem
from app.services.competency import compute_gaps
from app.services.recommend import recommend_for_gaps
from app.services.llm import explain_recommendation

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[RecommendationItem])
def get_my_recommendations(
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
    with_rationale: bool = False,
):
    gaps = compute_gaps(db, current)
    gap_by_comp = {g["competency_id"]: g for g in gaps}
    recs = recommend_for_gaps(db, gaps)

    results = []
    for r in recs:
        rationale = None
        if with_rationale:
            gap = gap_by_comp.get(r["matched_competency_id"])
            if gap:
                rationale = explain_recommendation(
                    gap["competency_name"], gap["competency_type"],
                    gap["current_level"], gap["required_level"],
                    r["module"].title, r["module"].description,
                )
        results.append(RecommendationItem(
            module=r["module"], matched_competency_id=r["matched_competency_id"],
            match_type=r["match_type"], score=r["score"], rationale=rationale or None,
        ))
    return results
