from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner
from app.schemas.schemas import NotificationOut
from app.services.notification_service import (
    get_learner_notifications, get_unread_count,
    mark_notification_read, mark_all_notifications_read,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationOut])
def get_notifications(
    unread_only: bool = False,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """Retrieves all notifications for the authenticated learner."""
    return get_learner_notifications(db, current.id, unread_only=unread_only)


@router.get("/unread-count")
def get_unread(
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """Returns number of unread alerts for the notification bell."""
    count = get_unread_count(db, current.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """Marks a single notification as read."""
    success = mark_notification_read(db, current.id, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "id": notification_id}


@router.post("/read-all")
def mark_all_read(
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """Marks all notifications as read."""
    count = mark_all_notifications_read(db, current.id)
    return {"status": "success", "marked_read": count}
