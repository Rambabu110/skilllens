"""
Question Version Control Service (PRD Part 15)

Statuses:
- ACTIVE: Approved for adaptive/fixed testing
- REVIEW: Flagged by syllabus changes or low discrimination
- SUPERSEDED: Replaced by newer question formulation
- ARCHIVED: Decommissioned from the active item pool
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import QuestionVersion, Quiz


def get_question_versions_by_status(
    db: Session,
    status: Optional[str] = None,
    limit: int = 50,
) -> List[QuestionVersion]:
    """Retrieves question versions filtered by status."""
    query = db.query(QuestionVersion)
    if status:
        query = query.filter(QuestionVersion.status == status)
    return query.order_by(QuestionVersion.created_at.desc()).limit(limit).all()


def update_question_version_status(
    db: Session,
    version_id: str,
    new_status: str,
) -> QuestionVersion:
    """Updates status of a question version (e.g., approve from REVIEW to ACTIVE)."""
    valid = {"ACTIVE", "REVIEW", "SUPERSEDED", "ARCHIVED"}
    if new_status not in valid:
        raise ValueError(f"Invalid status {new_status}. Allowed: {valid}")

    q_ver = db.query(QuestionVersion).get(version_id)
    if not q_ver:
        raise ValueError("Question version not found.")

    q_ver.status = new_status
    if new_status in {"SUPERSEDED", "ARCHIVED"}:
        q_ver.superseded_at = datetime.utcnow()
    db.commit()
    db.refresh(q_ver)
    return q_ver


def register_quiz_questions_versions(
    db: Session,
    quiz: Quiz,
    source_doc_id: Optional[str] = None,
) -> List[QuestionVersion]:
    """Creates versioned records for each question in a generated quiz."""
    created = []
    questions = quiz.questions or []
    for q in questions:
        q_id = q.get("question", "")[:32]
        # Check if version exists
        last_v = (
            db.query(QuestionVersion)
            .filter(QuestionVersion.question_id == q_id)
            .order_by(QuestionVersion.version.desc())
            .first()
        )
        new_v_num = (last_v.version + 1) if last_v else 1

        qv = QuestionVersion(
            question_id=q_id,
            quiz_id=quiz.id,
            version=new_v_num,
            status="ACTIVE",
            question_data=q,
            source_document_id=source_doc_id or quiz.source_document_id,
            created_at=datetime.utcnow(),
        )
        db.add(qv)
        created.append(qv)

    db.commit()
    return created
