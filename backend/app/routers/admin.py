from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import is_admin_email
from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_learner
from app.models.models import (
    Competency,
    Learner,
    LearnerCompetencyScore,
    LoginAudit,
    Position,
    Quiz,
    QuizAttempt,
)
from app.services.cohort_analytics import cohort_overview

router = APIRouter(prefix="/admin", tags=["admin"])


class UpdateRoleRequest(BaseModel):
    is_admin: bool


@router.get("/cohort-overview")
def get_cohort_overview(admin: Learner = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Department/position-level gap heatmap across every enrolled learner.
    """
    return cohort_overview(db)


@router.get("/stats")
def get_admin_stats(admin: Learner = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    High-level live operational statistics synced directly from Supabase DB.
    """
    total_learners = db.query(Learner).count()
    total_logins = db.query(LoginAudit).count()

    # Active in last 24 hours
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    active_today = (
        db.query(func.count(func.distinct(LoginAudit.email)))
        .filter(LoginAudit.created_at >= twenty_four_hours_ago, LoginAudit.status == "SUCCESS")
        .scalar()
        or 0
    )

    # Total critical gaps (gap >= 2.0)
    critical_gaps_count = (
        db.query(LearnerCompetencyScore)
        .join(Competency, LearnerCompetencyScore.competency_id == Competency.id)
        .filter((Competency.required_level - LearnerCompetencyScore.current_level) >= 2.0)
        .count()
    )

    total_cadres = db.query(Position).count()
    admin_count = db.query(Learner).filter(Learner.is_admin.is_(True)).count()

    return {
        "total_learners": total_learners,
        "total_logins": total_logins,
        "active_today": active_today,
        "total_critical_gaps": critical_gaps_count,
        "total_cadres": total_cadres,
        "admin_count": admin_count,
        "last_sync": datetime.utcnow().isoformat(),
    }


@router.get("/learners")
def get_all_learners(
    search: Optional[str] = Query(None, description="Search by name or email"),
    sort: str = Query("name_asc", description="Sort order: name_asc, name_desc, recent_login, newest, logins"),
    position_id: Optional[str] = Query(None, description="Filter by cadre position"),
    admin: Learner = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Alphabetical A-to-Z directory of all enrolled students and cadre officers.
    """
    query = db.query(Learner).options(joinedload(Learner.position), joinedload(Learner.scores))

    if position_id:
        query = query.filter(Learner.position_id == position_id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(or_(Learner.name.ilike(search_term), Learner.email.ilike(search_term)))

    if sort == "name_desc":
        query = query.order_by(Learner.name.desc())
    elif sort == "recent_login":
        query = query.order_by(Learner.last_login_at.desc().nullslast())
    elif sort == "newest":
        query = query.order_by(Learner.joining_date.desc())
    elif sort == "logins":
        query = query.order_by(Learner.login_count.desc())
    else:  # default: name_asc (A to Z)
        query = query.order_by(Learner.name.asc())

    learners = query.all()
    results = []

    # Pre-fetch required levels for gap computation
    competency_reqs = {c.id: c.required_level for c in db.query(Competency.id, Competency.required_level).all()}

    for l in learners:
        scores = l.scores or []
        total_comps = len(scores)
        avg_score = round(sum(s.current_level for s in scores) / total_comps, 2) if total_comps > 0 else 0.0

        critical_gaps = 0
        for s in scores:
            req = competency_reqs.get(s.competency_id, 3)
            if (req - s.current_level) >= 2.0:
                critical_gaps += 1

        results.append({
            "id": l.id,
            "name": l.name,
            "email": l.email,
            "position_id": l.position_id,
            "position_title": l.position.title if l.position else "Unassigned",
            "department": l.position.department if l.position else "General Administration",
            "qualification": l.qualification or "Graduate",
            "experience_years": l.experience_years or 0.0,
            "joining_date": l.joining_date.isoformat() if l.joining_date else None,
            "last_login_at": l.last_login_at.isoformat() if l.last_login_at else None,
            "login_count": l.login_count or 0,
            "is_admin": bool(l.is_admin),
            "total_competencies": total_comps,
            "avg_competency_score": avg_score,
            "critical_gaps_count": critical_gaps,
        })

    return results


@router.get("/learners/{learner_id}")
def get_learner_dossier(
    learner_id: str,
    admin: Learner = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Deep A-to-Z dossier of an individual student (all competencies, quizzes, audits).
    """
    learner = (
        db.query(Learner)
        .options(joinedload(Learner.position))
        .filter(Learner.id == learner_id)
        .first()
    )
    if not learner:
        raise HTTPException(status_code=404, detail="Student not found")

    # Competency breakdown
    scores_query = (
        db.query(LearnerCompetencyScore, Competency)
        .join(Competency, LearnerCompetencyScore.competency_id == Competency.id)
        .filter(LearnerCompetencyScore.learner_id == learner_id)
        .all()
    )

    competencies_list = []
    for score, comp in scores_query:
        gap = round(max(0.0, comp.required_level - score.current_level), 2)
        competencies_list.append({
            "id": comp.id,
            "name": comp.name,
            "type": comp.type.value if hasattr(comp.type, "value") else str(comp.type),
            "required_level": comp.required_level,
            "current_level": round(score.current_level, 2),
            "gap": gap,
            "is_critical": gap >= 2.0,
            "last_updated": score.last_updated.isoformat() if score.last_updated else None,
        })

    # Quiz attempts
    attempts = (
        db.query(QuizAttempt, Quiz)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .filter(QuizAttempt.learner_id == learner_id)
        .order_by(QuizAttempt.submitted_at.desc())
        .limit(20)
        .all()
    )
    quiz_list = [
        {
            "id": att.id,
            "quiz_title": q.title,
            "score": round(att.score, 1),
            "submitted_at": att.submitted_at.isoformat() if att.submitted_at else None,
        }
        for att, q in attempts
    ]

    # Login history for this student
    logins = (
        db.query(LoginAudit)
        .filter(LoginAudit.email == learner.email)
        .order_by(LoginAudit.created_at.desc())
        .limit(20)
        .all()
    )
    login_history = [
        {
            "id": a.id,
            "login_method": a.login_method,
            "ip_address": a.ip_address,
            "user_agent": a.user_agent,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in logins
    ]

    return {
        "profile": {
            "id": learner.id,
            "name": learner.name,
            "email": learner.email,
            "position_title": learner.position.title if learner.position else "Unassigned",
            "department": learner.position.department if learner.position else "General Administration",
            "qualification": learner.qualification or "Graduate",
            "experience_years": learner.experience_years or 0.0,
            "joining_date": learner.joining_date.isoformat() if learner.joining_date else None,
            "last_login_at": learner.last_login_at.isoformat() if learner.last_login_at else None,
            "login_count": learner.login_count or 0,
            "is_admin": bool(learner.is_admin),
        },
        "competencies": sorted(competencies_list, key=lambda x: x["gap"], reverse=True),
        "quizzes": quiz_list,
        "login_history": login_history,
    }


@router.patch("/learners/{learner_id}/role")
def update_learner_role(
    learner_id: str,
    payload: UpdateRoleRequest,
    admin: Learner = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Promote or demote a learner to/from Admin role.
    """
    learner = db.query(Learner).filter(Learner.id == learner_id).first()
    if not learner:
        raise HTTPException(status_code=404, detail="Student not found")

    learner.is_admin = payload.is_admin
    db.commit()
    db.refresh(learner)

    return {
        "id": learner.id,
        "name": learner.name,
        "email": learner.email,
        "is_admin": learner.is_admin,
    }


@router.get("/login-audits")
def get_login_audits(
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    admin: Learner = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Live real-time feed of all login and session authentication attempts.
    """
    query = db.query(LoginAudit).order_by(LoginAudit.created_at.desc())

    if status_filter:
        query = query.filter(LoginAudit.status == status_filter)

    audits = query.limit(limit).all()

    return [
        {
            "id": a.id,
            "learner_id": a.learner_id,
            "email": a.email,
            "name": a.name,
            "login_method": a.login_method,
            "ip_address": a.ip_address,
            "user_agent": a.user_agent,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in audits
    ]


@router.post("/bootstrap-admin")
def bootstrap_admin(
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """
    Bootstrap utility to grant admin access to designated admin emails or the first user.
    """
    if is_admin_email(current.email):
        current.is_admin = True
        db.commit()
        return {"status": "success", "message": f"{current.email} is now an Administrator", "is_admin": True}

    raise HTTPException(status_code=403, detail="Not eligible for automatic admin bootstrap")


# --- Comprehensive Audit Trail Stream ---
@router.get("/audit-events")
def get_audit_events(
    event_type: Optional[str] = None,
    limit: int = 100,
    admin: Learner = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Real-time immutable security and operational audit event stream."""
    from app.services.audit_service import get_audit_events_stream
    events = get_audit_events_stream(db, event_type=event_type, limit=limit)
    return [
        {
            "id": e.id,
            "actor_id": e.actor_id,
            "actor_type": e.actor_type,
            "event_type": e.event_type,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "old_value": e.old_value,
            "new_value": e.new_value,
            "ip": e.ip,
            "user_agent": e.user_agent,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        }
        for e in events
    ]


# --- Syllabus & Assessment Pattern Watch ---
class SyllabusCompareRequest(BaseModel):
    v1_title: str
    v1_text: str
    v2_title: str
    v2_text: str


@router.post("/syllabus/compare")
def compare_syllabus(
    payload: SyllabusCompareRequest,
    admin: Learner = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Syllabus & Assessment Pattern Watch — Prototype
    Ingests Syllabus v1 and v2, calculates ADDED/REMOVED/MODIFIED/UNCHANGED topics,
    and flags affected assessment questions for review.
    """
    from app.services.syllabus_service import ingest_and_compare_syllabus
    result = ingest_and_compare_syllabus(
        db=db,
        v1_title=payload.v1_title,
        v1_text=payload.v1_text,
        v2_title=payload.v2_title,
        v2_text=payload.v2_text,
    )
    return result


# --- Question Version Control & Review ---
@router.get("/questions/versions")
def list_question_versions(
    status: Optional[str] = None,
    limit: int = 50,
    admin: Learner = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lists question versions in the assessment item bank (ACTIVE, REVIEW, ARCHIVED)."""
    from app.services.question_version_service import get_question_versions_by_status
    versions = get_question_versions_by_status(db, status=status, limit=limit)
    return [
        {
            "id": v.id,
            "question_id": v.question_id,
            "quiz_id": v.quiz_id,
            "version": v.version,
            "status": v.status,
            "question_data": v.question_data,
            "source_document_id": v.source_document_id,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "superseded_at": v.superseded_at.isoformat() if v.superseded_at else None,
        }
        for v in versions
    ]


class UpdateQuestionStatusPayload(BaseModel):
    status: str


@router.post("/questions/versions/{version_id}/status")
def change_question_version_status(
    version_id: str,
    payload: UpdateQuestionStatusPayload,
    admin: Learner = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Updates a question version's status (e.g. approve from REVIEW to ACTIVE, or ARCHIVE)."""
    from app.services.question_version_service import update_question_version_status
    try:
        updated = update_question_version_status(db, version_id, payload.status)
        return {
            "id": updated.id,
            "status": updated.status,
            "version": updated.version,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

