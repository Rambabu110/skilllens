"""
SkillLens AI — Competency Reassessment Service (PRD Part 10)

Handles:
LEARNING COMPLETED -> REASSESS -> ADAPTIVE TEST / QUIZ -> UPDATE MASTERY
-> COMPARE BEFORE/AFTER -> GAP STATUS

If target reached: "Competency Target Achieved"
If not: "Continue Learning"
"""
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import (
    Learner, Competency, LearnerCompetencyScore,
    CompetencyEvidence, LearningModule, ModuleCompetency,
)
from app.services.knowledge_tracing import update_mastery
from app.services.evidence_service import record_competency_evidence


def process_competency_reassessment(
    db: Session,
    learner: Learner,
    competency_id: str,
    reassessment_score: float,  # 0-100
    evidence_reference: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Evaluates reassessment performance against required FRAC level:
    - Calculates before_level vs after_level
    - Updates BKT mastery probability
    - Records persistent competency evidence
    - Dispatches gamification rewards and notification hooks
    """
    comp = db.query(Competency).filter(Competency.id == competency_id).first()
    if not comp:
        raise ValueError(f"Competency {competency_id} not found.")

    score_row = (
        db.query(LearnerCompetencyScore)
        .filter(
            LearnerCompetencyScore.learner_id == learner.id,
            LearnerCompetencyScore.competency_id == competency_id,
        )
        .first()
    )

    before_level = score_row.current_level if score_row else 2.0
    implied_level = (reassessment_score / 100.0) * 5.0
    is_correct = reassessment_score >= 60.0

    # Moving average weight: 50% prior, 50% reassessment empirical evidence
    after_level = round(0.50 * before_level + 0.50 * implied_level, 2)
    improvement = round(after_level - before_level, 2)

    prior_mastery = getattr(score_row, "mastery_probability", 0.3) if score_row else 0.3
    new_mastery = update_mastery(prior_mastery, is_correct)

    if not score_row:
        score_row = LearnerCompetencyScore(
            learner_id=learner.id,
            competency_id=competency_id,
            current_level=after_level,
            confidence=0.75,
            mastery_probability=new_mastery,
            last_updated=datetime.utcnow(),
        )
        db.add(score_row)
    else:
        score_row.current_level = after_level
        score_row.mastery_probability = new_mastery
        score_row.confidence = min(0.99, (score_row.confidence or 0.6) + 0.1)
        score_row.last_updated = datetime.utcnow()

    db.commit()

    # Determine status
    target_achieved = bool(after_level >= comp.required_level)
    gap_status = "Competency Target Achieved" if target_achieved else "Continue Learning"

    # Save evidence
    ref_payload = {
        **(evidence_reference or {}),
        "target_level": comp.required_level,
        "reassessment_score_pct": reassessment_score,
        "is_gap_closed": target_achieved,
    }
    evidence = record_competency_evidence(
        db=db,
        learner_id=learner.id,
        competency_id=competency_id,
        assessment_type="REASSESSMENT",
        assessment_id=f"reassess_{int(datetime.utcnow().timestamp())}",
        score=reassessment_score,
        before_level=before_level,
        after_level=after_level,
        mastery_prob=new_mastery,
        confidence=score_row.confidence,
        evidence_reference=ref_payload,
        source="skilllens_reassessment_engine",
    )

    # Trigger gamification & notifications lazily to avoid circular imports
    try:
        from app.services.gamification_service import award_points_for_event, check_and_award_badges
        from app.services.notification_service import create_notification

        award_points_for_event(db, learner.id, "REASSESSMENT_COMPLETED", 20, f"Completed reassessment for {comp.name}")
        if target_achieved:
            award_points_for_event(db, learner.id, "GAP_CLOSED", 50, f"Closed critical gap for {comp.name}")
            create_notification(
                db=db,
                learner_id=learner.id,
                type="COMPETENCY_ACHIEVED",
                title="Competency Target Achieved!",
                message=f"Congratulations! You reached Level {after_level}/{comp.required_level} in '{comp.name}'.",
                related_competency=comp.id,
            )
        else:
            create_notification(
                db=db,
                learner_id=learner.id,
                type="REASSESSMENT_AVAILABLE",
                title="Reassessment Recorded",
                message=f"Score updated for '{comp.name}': {before_level} → {after_level} ({'+' if improvement >= 0 else ''}{improvement}).",
                related_competency=comp.id,
            )
        check_and_award_badges(db, learner.id)
    except Exception as e:
        print(f"[Reassessment Post-Hooks Error] {e}")

    return {
        "competency_id": competency_id,
        "competency_name": comp.name,
        "before_level": before_level,
        "after_level": after_level,
        "improvement": improvement,
        "gap_status": gap_status,
        "target_achieved": target_achieved,
        "score": reassessment_score,
        "evidence_id": evidence.id,
    }
