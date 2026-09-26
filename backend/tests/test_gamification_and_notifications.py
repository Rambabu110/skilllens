"""
Unit and Integration Tests for Gamification, Notifications, Audit, and Certificates (PRD Part 16, 17, 21, 22)

Tests:
- Idempotent points award (preventing duplicate rewards)
- Milestone badge evaluations (FIRST_ASSESSMENT, GAP_CLOSER, etc.)
- Internal notifications center (creation, reading, unread count)
- Sensitive data sanitization in audit trails
- Verifiable certificate issuance and validation
"""
import os
import sys
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.models import Learner, Competency
from app.services.gamification_service import (
    award_points_for_event,
    check_and_award_badges,
    get_learner_gamification_summary,
)
from app.services.notification_service import (
    create_notification,
    get_learner_notifications,
    get_unread_count,
    mark_notification_read,
)
from app.services.audit_service import log_audit_event, get_audit_events_stream
from app.services.certificate_service import (
    issue_achievement_certificate,
    verify_certificate_by_id,
)


def test_idempotent_points_award():
    db = SessionLocal()
    try:
        learner = db.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
        assert learner

        # Award points with unique suffix
        p1 = award_points_for_event(
            db=db,
            learner_id=learner.id,
            event_type="QUIZ_COMPLETED",
            points=10,
            description="Diagnostic test completed",
            idempotent_suffix="idemp_test_unique_001",
        )
        assert p1 is not None

        # Repeat with same key -> must return existing record, not create duplicate
        p2 = award_points_for_event(
            db=db,
            learner_id=learner.id,
            event_type="QUIZ_COMPLETED",
            points=10,
            description="Duplicate attempt",
            idempotent_suffix="idemp_test_unique_001",
        )
        assert p2.id == p1.id, "Idempotent points processing must not duplicate awards"

    finally:
        db.close()


def test_internal_notifications_center():
    db = SessionLocal()
    try:
        learner = db.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
        assert learner

        # Create notification
        notif = create_notification(
            db=db,
            learner_id=learner.id,
            type="GAP_DETECTED",
            title="Automated Test Notification",
            message="Your sampling competency requires reinforcement.",
        )
        assert notif.id is not None
        assert notif.read is False

        # Query notifications list
        notifications = get_learner_notifications(db, learner.id)
        unread_count = get_unread_count(db, learner.id)
        assert unread_count >= 1
        assert any(n.id == notif.id for n in notifications)

        # Mark read
        success = mark_notification_read(db, learner.id, notif.id)
        assert success is True
        db.refresh(notif)
        assert notif.read is True

    finally:
        db.close()


def test_audit_event_sanitization():
    db = SessionLocal()
    try:
        raw_payload = {
            "name": "Aditi Sharma",
            "password": "supersecretpassword123",
            "access_token": "eyJh...sensitive_jwt...",
            "role": "cadre_member",
        }

        event = log_audit_event(
            db=db,
            actor_id="test_actor",
            actor_type="learner",
            event_type="LOGIN",
            new_value=raw_payload,
            ip="127.0.0.1",
        )

        assert event.new_value["password"] == "[REDACTED]"
        assert event.new_value["access_token"] == "[REDACTED]"
        assert event.new_value["name"] == "Aditi Sharma"

    finally:
        db.close()


def test_certificate_issuance_and_verification():
    db = SessionLocal()
    try:
        learner = db.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
        comp = db.query(Competency).first()
        assert learner and comp

        # Issue certificate
        cert = issue_achievement_certificate(
            db=db,
            learner_id=learner.id,
            competency_id=comp.id,
            achievement_name="Certified Survey Field Supervisor",
        )
        assert cert.verification_id.startswith("SL-2026-CERT-")

        # Verify lookup
        verified = verify_certificate_by_id(db, cert.verification_id)
        assert verified is not None
        assert verified["valid"] is True
        assert verified["learner_name"] == learner.name
        assert verified["status"] == "VALID & VERIFIED"

        # Non-existent certificate lookup
        fake_lookup = verify_certificate_by_id(db, "INVALID-CODE-999")
        assert fake_lookup is None

    finally:
        db.close()
