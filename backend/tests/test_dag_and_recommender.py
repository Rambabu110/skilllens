"""
Unit and Integration Tests for Prereq DAG, Root-Cause Engine, and Hybrid Recommender (PRD Part 11, 12, 13)

Tests:
- DAG cycle validation and self-loop rejection
- Deepest upstream root cause discovery
- 6-factor hybrid recommender scoring and itemized rationales
- Dynamic learning path sequencing and step unlocking
"""
import os
import sys
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.models import Learner, Competency, LearningModule
from app.services.dag_service import validate_dag, find_upstream_root_cause, get_validated_prereq_graph
from app.services.recommend import recommend_for_gaps, RECOMMENDER_WEIGHTS
from app.services.learning_path_service import sync_learner_learning_path, update_step_status


def test_dag_cycle_detection():
    # Valid linear chain: A -> B -> C
    valid_edges = [("A", "B"), ("B", "C")]
    is_valid, cycle = validate_dag(valid_edges)
    assert is_valid is True
    assert cycle is None

    # Invalid self-loop: A -> A
    self_loop = [("A", "A")]
    is_valid, cycle = validate_dag(self_loop)
    assert is_valid is False
    assert "A" in cycle

    # Invalid cycle: A -> B -> C -> A
    cyclic_edges = [("A", "B"), ("B", "C"), ("C", "A")]
    is_valid, cycle = validate_dag(cyclic_edges)
    assert is_valid is False
    assert set(cycle) == {"A", "B", "C"}


def test_upstream_root_cause():
    # Knowledge dependency: Fundamentals -> Sampling Design -> Advanced Sampling
    prereq_map = {
        "Advanced Sampling": ["Sampling Design"],
        "Sampling Design": ["Fundamentals"],
    }
    gap_map = {
        "Advanced Sampling": 1.5,
        "Sampling Design": 1.2,
        "Fundamentals": 0.8,
    }
    name_map = {
        "Advanced Sampling": "Advanced Sampling",
        "Sampling Design": "Sampling Design",
        "Fundamentals": "Fundamentals",
    }

    # Discovering root cause of failure in Advanced Sampling should yield Fundamentals (depth 2)
    root_name, depth = find_upstream_root_cause(
        "Advanced Sampling", gap_map, prereq_map, name_map
    )
    assert root_name == "Fundamentals"
    assert depth == 2


def test_hybrid_recommender_weights():
    # Central weights must sum to 1.0
    total_weights = sum(RECOMMENDER_WEIGHTS.values())
    assert abs(total_weights - 1.0) < 0.001

    db = SessionLocal()
    try:
        sample_gaps = [
            {
                "competency_id": "c1",
                "competency_name": "Statistical Sampling Methods",
                "competency_type": "domain",
                "current_level": 2.2,
                "required_level": 4.0,
                "gap_size": 1.8,
                "status": "critical",
                "depth": 1,
                "root_gap_competency": "Field Data Collection Protocols",
                "mastery_probability": 0.4,
            }
        ]

        recs = recommend_for_gaps(db, sample_gaps, learner_id=None, top_n=3)
        assert isinstance(recs, list)
        if recs:
            top_rec = recs[0]
            assert "module" in top_rec
            assert "score" in top_rec
            assert "rationale" in top_rec
            assert len(top_rec["rationale"]) > 10
            # Rationale must contain itemized explanation
            assert "addresses" in top_rec["rationale"].lower() or "prerequisite" in top_rec["rationale"].lower()
    finally:
        db.close()


def test_learning_path_step_unlock():
    db = SessionLocal()
    try:
        learner = db.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
        assert learner

        steps = sync_learner_learning_path(db, learner)
        assert len(steps) >= 1
        first_step = steps[0]
        assert first_step.status in ["RECOMMENDED", "IN_PROGRESS", "COMPLETED"]

        # Completing the first step should automatically unlock the next step in line
        if len(steps) > 1:
            second_step = steps[1]
            update_step_status(db, learner.id, first_step.id, "COMPLETED", score=85.0)
            db.refresh(second_step)
            assert second_step.status in ["RECOMMENDED", "IN_PROGRESS", "COMPLETED"]
    finally:
        db.close()
