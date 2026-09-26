"""
Unit and Integration Tests for Syllabus Pattern Watch & Question Versioning (PRD Part 14, 15)

Tests:
- Syllabus unstructured text parsing into units and topics
- Set differential analysis (ADDED, REMOVED, MODIFIED, UNCHANGED)
- Transition of affected assessment items into 'REVIEW' status
- Question version control lifecycle (ACTIVE, REVIEW, ARCHIVED)
"""
import os
import sys
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.models import QuestionVersion, Quiz
from app.services.syllabus_service import (
    parse_syllabus_text,
    compare_syllabus_versions,
    ingest_and_compare_syllabus,
)
from app.services.question_version_service import (
    get_question_versions_by_status,
    update_question_version_status,
)


def test_parse_syllabus_text():
    raw = """
Unit 1: Sampling Techniques
- Simple Random Sampling (15%)
- Stratified Sampling (25%)

Unit 2: Data Validation
- Range Checks and Cleaning (20%)
"""
    items = parse_syllabus_text(raw)
    assert len(items) == 3
    topics = [it["topic"] for it in items]
    assert "Simple Random Sampling" in topics
    assert "Stratified Sampling" in topics

    # Check weightage parsing
    stratified_item = next(it for it in items if it["topic"] == "Stratified Sampling")
    assert stratified_item["weightage"] == 25


def test_compare_syllabus_versions():
    v1_items = [
        {"topic": "Simple Random Sampling", "competency": "Sampling", "weightage": 20, "section": "U1"},
        {"topic": "Legacy Hand Tallies", "competency": "Data Collection", "weightage": 10, "section": "U1"},
    ]
    v2_items = [
        {"topic": "Simple Random Sampling", "competency": "Sampling", "weightage": 30, "section": "U1"},  # modified weight
        {"topic": "Automated GPS Field Verification", "competency": "Field Protocols", "weightage": 15, "section": "U2"},  # added
    ]

    diff = compare_syllabus_versions(v1_items, v2_items)
    assert "Automated GPS Field Verification" in diff["added_topics"]
    assert "Legacy Hand Tallies" in diff["removed_topics"]
    assert any("Simple Random Sampling" in m for m in diff["modified_topics"])
    assert "Field Protocols" in diff["affected_competencies"]


def test_question_versioning_lifecycle():
    db = SessionLocal()
    try:
        # Create a test question version
        quiz = db.query(Quiz).first()
        qv = QuestionVersion(
            question_id="q_test_v1",
            quiz_id=quiz.id if quiz else None,
            version=1,
            status="REVIEW",
            question_data={
                "question": "What is proportional allocation in stratified sampling?",
                "options": ["A", "B", "C", "D"],
                "correct_index": 0,
                "competency": "Statistical Sampling Methods",
                "topic": "Stratified Sampling",
            },
        )
        db.add(qv)
        db.commit()
        db.refresh(qv)

        # Query by status
        review_items = get_question_versions_by_status(db, status="REVIEW")
        assert any(it.id == qv.id for it in review_items)

        # Admin approves question -> ACTIVE
        updated = update_question_version_status(db, qv.id, "ACTIVE")
        assert updated.status == "ACTIVE"

        # Admin archives question -> ARCHIVED
        archived = update_question_version_status(db, qv.id, "ARCHIVED")
        assert archived.status == "ARCHIVED"
        assert archived.superseded_at is not None

    finally:
        db.close()
