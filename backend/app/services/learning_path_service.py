"""
SkillLens AI — Dynamic Learning Path Service (PRD Part 13)

Statuses:
- LOCKED
- RECOMMENDED
- IN_PROGRESS
- COMPLETED
- REASSESS_REQUIRED
- MASTERED

Builds a sequenced, prerequisite-aware pathway and dynamically unlocks
subsequent steps as upstream prerequisites and modules are completed.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import Learner, Competency, LearningModule, ModuleCompetency, LearningPathStep
from app.services.competency import compute_gaps
from app.services.dag_service import get_validated_prereq_graph


def sync_learner_learning_path(db: Session, learner: Learner) -> List[LearningPathStep]:
    """
    Ensures learner has an active sequence of learning steps based on their gaps
    and the prerequisite knowledge graph.
    """
    existing_steps = (
        db.query(LearningPathStep)
        .filter(LearningPathStep.learner_id == learner.id)
        .order_by(LearningPathStep.order_index)
        .all()
    )
    if existing_steps:
        return existing_steps

    gaps = compute_gaps(db, learner)
    critical_and_dev = [g for g in gaps if g["status"] != "strength"]
    if not critical_and_dev:
        # All strength, pick top benchmark competencies
        critical_and_dev = gaps[:3]

    # Order competencies: root causes first, then dependent competencies
    prereq_map = get_validated_prereq_graph(db)
    
    # Sort by depth descending (root causes first)
    critical_and_dev.sort(key=lambda g: -g.get("depth", 0))

    order_idx = 1
    new_steps = []

    for gap in critical_and_dev:
        comp_id = gap["competency_id"]
        # Find matching modules
        links = db.query(ModuleCompetency).filter(ModuleCompetency.competency_id == comp_id).all()
        for link in links:
            module = db.query(LearningModule).get(link.module_id)
            if not module:
                continue

            # First step is RECOMMENDED, subsequent steps are LOCKED until previous is completed
            initial_status = "RECOMMENDED" if order_idx == 1 else "LOCKED"
            step = LearningPathStep(
                learner_id=learner.id,
                module_id=module.id,
                competency_id=comp_id,
                order_index=order_idx,
                status=initial_status,
                created_at=datetime.utcnow(),
            )
            db.add(step)
            new_steps.append(step)
            order_idx += 1
            if order_idx > 5:
                break
        if order_idx > 5:
            break

    db.commit()
    for s in new_steps:
        db.refresh(s)
    return new_steps


def get_learning_path_overview(db: Session, learner: Learner) -> List[Dict[str, Any]]:
    """Returns serialized learning path steps with module details."""
    steps = sync_learner_learning_path(db, learner)
    comp_map = {c.id: c.name for c in db.query(Competency).all()}

    results = []
    for s in steps:
        mod = s.module
        results.append({
            "id": s.id,
            "learner_id": s.learner_id,
            "module_id": s.module_id,
            "competency_id": s.competency_id,
            "module_title": mod.title if mod else "Module",
            "module_description": mod.description if mod else "",
            "competency_name": comp_map.get(s.competency_id, "Competency"),
            "order_index": s.order_index,
            "status": s.status,
            "duration_minutes": mod.duration_minutes if mod else 60,
            "level": mod.level if mod else 1,
            "score": s.score,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        })
    return results


def update_step_status(
    db: Session,
    learner_id: str,
    step_id: str,
    new_status: str,
    score: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Updates the step status and automatically unlocks the next step if COMPLETED or MASTERED.
    """
    step = (
        db.query(LearningPathStep)
        .filter(LearningPathStep.id == step_id, LearningPathStep.learner_id == learner_id)
        .first()
    )
    if not step:
        raise ValueError("Learning path step not found.")

    valid_statuses = {"LOCKED", "RECOMMENDED", "IN_PROGRESS", "COMPLETED", "REASSESS_REQUIRED", "MASTERED"}
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status {new_status}. Must be one of {valid_statuses}")

    step.status = new_status
    if score is not None:
        step.score = score
    if new_status in {"COMPLETED", "MASTERED"}:
        step.completed_at = datetime.utcnow()

        # Unlock next step in line
        next_step = (
            db.query(LearningPathStep)
            .filter(
                LearningPathStep.learner_id == learner_id,
                LearningPathStep.order_index == step.order_index + 1,
            )
            .first()
        )
        if next_step and next_step.status == "LOCKED":
            next_step.status = "RECOMMENDED"

    db.commit()
    db.refresh(step)
    return {
        "step_id": step.id,
        "status": step.status,
        "order_index": step.order_index,
        "completed_at": step.completed_at.isoformat() if step.completed_at else None,
    }
