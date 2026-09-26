"""
SkillLens AI — Diagnostic, Role Readiness & Resilient Upload Tests
Validates:
1. 5-7 question adaptive diagnostic flow (start + answer + difficulty calibration)
2. Role readiness profile across 4 dimensions + before/after progression snapshots
3. Resilient PDF upload recovery (no crash on scanned or corrupt streams)
4. Default cadre assessment generation
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.models.models import Learner, Position, Competency, LearnerCompetencyScore
from app.core.security import create_access_token

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def auth_headers(db_session: Session):
    learner = db_session.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
    if not learner:
        learner = db_session.query(Learner).first()
    token = create_access_token(learner.email)
    return {"Authorization": f"Bearer {token}"}


def test_diagnostic_start(auth_headers):
    res = client.post(
        "/diagnostic/start",
        headers=auth_headers,
        json={
            "target_role": "Junior Statistical Officer",
            "desired_timeline_months": 12,
            "learning_preference": "guided",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert data["status"] == "in_progress"
    assert data["question_number"] == 1
    assert "question" in data
    assert len(data["question"]["options"]) == 4


def test_diagnostic_answer_flow(auth_headers):
    start_res = client.post(
        "/diagnostic/start",
        headers=auth_headers,
        json={"target_role": "Junior Statistical Officer"},
    )
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]
    q_id = start_res.json()["question"]["id"]

    # Submit answer
    ans_res = client.post(
        "/diagnostic/answer",
        headers=auth_headers,
        json={
            "session_id": session_id,
            "question_id": q_id,
            "selected_option": 0,
        },
    )
    assert ans_res.status_code == 200
    ans_data = ans_res.json()
    assert ans_data["status"] in ["in_progress", "diagnostic_complete"]


def test_role_readiness_profile(auth_headers):
    res = client.get("/readiness", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "overall_readiness_pct" in data
    assert "dimensions" in data
    assert "technical_competencies" in data["dimensions"]
    assert "problem_solving" in data["dimensions"]
    assert "practical_application" in data["dimensions"]
    assert "communication_viva" in data["dimensions"]
    assert data["evidence_confidence"] in ["HIGH", "MEDIUM", "LOW"]
    assert "progression_history" in data


def test_resilient_upload_recovery_scanned_pdf(auth_headers):
    # Simulate a minimal PDF with 0 extractable text (like a scanned image)
    dummy_pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF"
    
    files = {"file": ("Basic_English_Grammar_Book_1.pdf", dummy_pdf_bytes, "application/pdf")}
    res = client.post("/quiz/upload", headers=auth_headers, files=files)
    
    # Must NOT fail with HTTP 400
    assert res.status_code == 200
    data = res.json()
    assert "document_id" in data
    assert data["rag_ready"] is True
    assert data["chunks_indexed"] > 0


def test_default_cadre_quiz_generation(auth_headers):
    # Generating a quiz without specifying a document or module should generate standard cadre assessment
    res = client.post(
        "/quiz/generate",
        headers=auth_headers,
        json={
            "num_questions": 5,
            "language": "en",
            "mode": "adaptive",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["questions"]) > 0
    assert "Cadre Assessment" in data["title"]
