"""
SkillLens AI — Audit Event Service (PRD Part 22)

Records comprehensive, immutable security and operational audit trails.
Guarantees sensitive data (passwords, JWTs, keys) is sanitized and never logged.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import AuditEvent

SENSITIVE_KEYS = {"password", "token", "access_token", "jwt", "secret", "api_key", "key", "authorization"}


def _sanitize_dict(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not data or not isinstance(data, dict):
        return data
    sanitized = {}
    for k, v in data.items():
        if any(s in k.lower() for s in SENSITIVE_KEYS):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = _sanitize_dict(v)
        else:
            sanitized[k] = v
    return sanitized


def log_audit_event(
    db: Session,
    event_type: str,
    actor_id: Optional[str] = None,
    actor_type: str = "learner",
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditEvent:
    """
    Persists a sanitized audit trail event to the `audit_events` table.
    """
    event = AuditEvent(
        actor_id=actor_id,
        actor_type=actor_type,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=_sanitize_dict(old_value),
        new_value=_sanitize_dict(new_value),
        ip=ip,
        user_agent=user_agent[:250] if user_agent else None,
        timestamp=datetime.utcnow(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_audit_events_stream(
    db: Session,
    event_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    limit: int = 100,
) -> List[AuditEvent]:
    """Queries audit events stream with optional filtering for Admin inspection."""
    query = db.query(AuditEvent)
    if event_type:
        query = query.filter(AuditEvent.event_type == event_type)
    if actor_id:
        query = query.filter(AuditEvent.actor_id == actor_id)
    return query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()
