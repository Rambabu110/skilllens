"""
SkillLens AI — Notification Center Service (PRD Part 21)

Provides an in-app notification center for civil service learners:
- Real notifications for GAP_DETECTED, NEW_RECOMMENDATION, REASSESSMENT_AVAILABLE,
  COMPETENCY_ACHIEVED, LEARNING_PATH_UPDATED, BADGE_EARNED.
- Unread counter, mark as read, mark all read.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import Notification


def create_notification(
    db: Session,
    learner_id: str,
    type: str,
    title: str,
    message: str,
    related_competency: Optional[str] = None,
    related_module: Optional[str] = None,
) -> Notification:
    """Dispatches an in-app notification to a learner."""
    notif = Notification(
        learner_id=learner_id,
        type=type,
        title=title,
        message=message,
        read=False,
        related_competency=related_competency,
        related_module=related_module,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_learner_notifications(
    db: Session,
    learner_id: str,
    unread_only: bool = False,
    limit: int = 50,
) -> List[Notification]:
    """Retrieves chronological notifications for a learner."""
    query = db.query(Notification).filter(Notification.learner_id == learner_id)
    if unread_only:
        query = query.filter(Notification.read.is_(False))
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


def get_unread_count(db: Session, learner_id: str) -> int:
    """Returns number of unread notifications for the bell badge."""
    return db.query(Notification).filter(
        Notification.learner_id == learner_id,
        Notification.read.is_(False),
    ).count()


def mark_notification_read(db: Session, learner_id: str, notification_id: str) -> bool:
    """Marks an individual notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.learner_id == learner_id)
        .first()
    )
    if not notif:
        return False
    notif.read = True
    db.commit()
    return True


def mark_all_notifications_read(db: Session, learner_id: str) -> int:
    """Marks all unread notifications for this learner as read."""
    unread = (
        db.query(Notification)
        .filter(Notification.learner_id == learner_id, Notification.read.is_(False))
        .all()
    )
    count = len(unread)
    for n in unread:
        n.read = True
    db.commit()
    return count
