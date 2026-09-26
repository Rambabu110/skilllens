from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner
from app.schemas.schemas import LearningPathStepOut, UpdateStepStatusRequest
from app.services.learning_path_service import get_learning_path_overview, update_step_status

router = APIRouter(prefix="/learning-path", tags=["learning-path"])


@router.get("", response_model=List[LearningPathStepOut])
@router.get("/overview", response_model=List[LearningPathStepOut])
def get_my_learning_path(
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """Returns the sequenced dynamic learning pathway for the authenticated learner."""
    return get_learning_path_overview(db, current)



@router.post("/step/{step_id}/status")
def update_step(
    step_id: str,
    payload: UpdateStepStatusRequest,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """Updates status of a learning pathway step and dynamically unlocks subsequent units."""
    try:
        return update_step_status(db, current.id, step_id, payload.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
