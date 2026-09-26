from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner
from app.services.gamification_service import get_learner_gamification_summary

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/summary")
def get_gamification_summary(
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """Returns total points, chronological point awards history, and unlocked badges."""
    return get_learner_gamification_summary(db, current.id)
