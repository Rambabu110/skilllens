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

