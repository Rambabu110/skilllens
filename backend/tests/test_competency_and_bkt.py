"""
Unit and Integration Tests for Competency Evidence, BKT, and Reassessment (PRD Part 8, 9, 10)

Tests:
- Bayesian Knowledge Tracing (BKT) probability updates
- Topic-level mastery updates per question
- Immutable competency evidence logging
- Competency reassessment before/after comparison
"""
import os
import sys
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.models import Learner, Competency, LearnerCompetencyScore, Topic, LearnerTopicMastery, CompetencyEvidence
from app.services.knowledge_tracing import update_mastery, P_INIT, P_LEARN
from app.services.evidence_service import (
    record_competency_evidence,
    update_topic_mastery_for_question,
    get_learner_competency_evidence_history,
)
from app.services.reassessment_service import process_competency_reassessment


def test_bkt_probability_update():
    # When correct, mastery probability must increase
    prior = 0.30
    post_correct = update_mastery(prior, correct=True)
    assert post_correct > prior, "Correct answer must increase mastery probability"

    # When incorrect, mastery probability must decrease
    post_incorrect = update_mastery(prior, correct=False)
    assert post_incorrect < prior, "Incorrect answer must decrease mastery probability"

    # Extreme boundary clamps
    assert 0.01 <= update_mastery(0.99, correct=True) <= 0.99
    assert 0.01 <= update_mastery(0.01, correct=False) <= 0.99


def test_topic_mastery_and_evidence():
    db = SessionLocal()
    try:
        # Create test learner & competency
        learner = db.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
        assert learner is not None, "Demo learner must exist"

        comp = db.query(Competency).first()
        assert comp is not None, "Competency must exist"

        # Test topic mastery update
        topic_name = "Unit Testing Topic"
        update_topic_mastery_for_question(db, learner.id, comp.id, topic_name, is_correct=True)

        tm = (
            db.query(LearnerTopicMastery)
            .join(Topic)
            .filter(LearnerTopicMastery.learner_id == learner.id, Topic.name == topic_name)
            .first()
        )
        assert tm is not None
        assert tm.attempts >= 1
        assert tm.correct >= 1
        assert tm.mastery_probability > 0.3

        # Test immutable competency evidence recording
        ev = record_competency_evidence(
            db=db,
            learner_id=learner.id,
            competency_id=comp.id,
            assessment_type="MCQ",
            assessment_id="test_attempt_999",
            score=85.0,
            before_level=2.0,
            after_level=2.5,
            mastery_prob=0.72,
            confidence=0.88,
            evidence_reference={"quiz_title": "Automated Test Quiz", "items": 5},
            source="test_runner",
        )
        assert ev.id is not None
        assert ev.score == 85.0
        assert ev.before_level == 2.0
        assert ev.after_level == 2.5

        # Query history
        history = get_learner_competency_evidence_history(db, learner.id, comp.id)
        assert len(history) >= 1
        assert any(h["assessment_id"] == "test_attempt_999" for h in history)

    finally:
        db.close()


def test_reassessment_delta():
    db = SessionLocal()
    try:
        learner = db.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
        comp = db.query(Competency).filter(Competency.name == "Statistical Sampling Methods").first()
        assert learner and comp

        score_row = db.query(LearnerCompetencyScore).filter(
            LearnerCompetencyScore.learner_id == learner.id,
            LearnerCompetencyScore.competency_id == comp.id,
        ).first()
        initial_level = score_row.current_level if score_row else 2.0

        # Run reassessment with a strong 90% score
        res = process_competency_reassessment(
            db=db,
            learner=learner,
            competency_id=comp.id,
            reassessment_score=90.0,
        )

        assert res["competency_id"] == comp.id
        assert res["before_level"] == initial_level
        assert res["after_level"] > initial_level
        assert res["improvement"] > 0
        assert "gap_status" in res
    finally:
        db.close()
