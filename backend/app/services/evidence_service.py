"""
Competency Evidence & Topic Mastery Service (PRD Part 8 & Part 9)

Every assessment (MCQ, CAT, Viva, Reassessment) logs an immutable
evidence record to `competency_evidence` and updates topic mastery
using Bayesian Knowledge Tracing.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import (
    Learner, Competency, LearnerCompetencyScore, Topic,
    LearnerTopicMastery, CompetencyEvidence,
)
from app.services.knowledge_tracing import update_mastery


def record_competency_evidence(
    db: Session,
    learner_id: str,
    competency_id: str,
    assessment_type: str,
    assessment_id: Optional[str],
    score: float,
    before_level: float,
    after_level: float,
    mastery_prob: Optional[float] = None,
    confidence: Optional[float] = None,
    evidence_reference: Optional[Dict[str, Any]] = None,
    source: str = "skilllens_assessment",
) -> CompetencyEvidence:
    """Creates a verifiable audit record of competency level advancement."""
    evidence = CompetencyEvidence(
        learner_id=learner_id,
        competency_id=competency_id,
        assessment_type=assessment_type,
        assessment_id=assessment_id,
        score=round(score, 2),
        before_level=round(before_level, 2),
        after_level=round(after_level, 2),
        mastery_probability=round(mastery_prob, 4) if mastery_prob is not None else None,
        confidence=round(confidence, 2) if confidence is not None else None,
        source=source,
        evidence_reference=evidence_reference or {},
        timestamp=datetime.utcnow(),
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


def update_topic_mastery_for_question(
    db: Session,
    learner_id: str,
    competency_id: str,
    topic_name: str,
    is_correct: bool,
) -> LearnerTopicMastery:
    """
    Finds or creates a Topic under the Competency, then applies BKT to update
    the learner's topic mastery probability.
    """
    if not topic_name or not topic_name.strip():
        topic_name = "Core Conceptual Foundations"

    topic = (
        db.query(Topic)
        .filter(Topic.competency_id == competency_id, Topic.name.ilike(topic_name.strip()))
        .first()
    )
    if not topic:
        topic = Topic(
            competency_id=competency_id,
            name=topic_name.strip(),
            description=f"Curriculum topic under competency {competency_id}",
        )
        db.add(topic)
        db.commit()
        db.refresh(topic)

    mastery_row = (
        db.query(LearnerTopicMastery)
        .filter(
            LearnerTopicMastery.learner_id == learner_id,
            LearnerTopicMastery.topic_id == topic.id,
        )
        .first()
    )
    if not mastery_row:
        mastery_row = LearnerTopicMastery(
            learner_id=learner_id,
            topic_id=topic.id,
            mastery_probability=0.3,
            attempts=0,
            correct=0,
            confidence=0.4,
        )
        db.add(mastery_row)

    mastery_row.attempts += 1
    if is_correct:
        mastery_row.correct += 1
    mastery_row.mastery_probability = update_mastery(mastery_row.mastery_probability, is_correct)
    mastery_row.confidence = min(0.99, (mastery_row.confidence or 0.4) + 0.05)
    mastery_row.last_assessed = datetime.utcnow()

    db.commit()
    db.refresh(mastery_row)
    return mastery_row


def get_learner_competency_evidence_history(
    db: Session,
    learner_id: str,
    competency_id: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Returns chronological evidence items with competency metadata."""
    query = db.query(CompetencyEvidence).filter(CompetencyEvidence.learner_id == learner_id)
    if competency_id:
        query = query.filter(CompetencyEvidence.competency_id == competency_id)
    
    rows = query.order_by(CompetencyEvidence.timestamp.desc()).limit(limit).all()
    comp_map = {c.id: c.name for c in db.query(Competency).all()}

    results = []
    for r in rows:
        results.append({
            "id": r.id,
            "competency_id": r.competency_id,
            "competency_name": comp_map.get(r.competency_id, "Official Competency"),
            "assessment_type": r.assessment_type,
            "assessment_id": r.assessment_id,
            "score": r.score,
            "before_level": r.before_level,
            "after_level": r.after_level,
            "improvement": round(r.after_level - r.before_level, 2),
            "mastery_probability": r.mastery_probability,
            "confidence": r.confidence,
            "source": r.source,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "evidence_reference": r.evidence_reference,
        })
    return results
