"""
tests/test_onboarding_wizard.py
Tests for the Onboarding Wizard backend endpoints:
  POST /auth/onboarding
  GET  /positions/{id}/detail
  GET  /me/status
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.models import Learner, Position
from app.core.security import hash_password, create_access_token

client = TestClient(app)


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _get_or_create_test_learner(db, email="onboarding_test@skilllens.in", name="Onboard Tester"):
    """Return a learner for onboarding tests (creates if missing)."""
    learner = db.query(Learner).filter(Learner.email == email).first()
    if not learner:
        learner = Learner(
            name=name,
            email=email,
            hashed_password=hash_password("test1234"),
            is_admin=False,
            onboarding_completed=False,
        )
        db.add(learner)
        db.commit()
        db.refresh(learner)
    return learner


def _token_for(learner_email: str) -> str:
    return create_access_token(learner_email)


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestOnboardingWizard:

    def test_get_positions_returns_list(self):
        """GET /positions should return a list of positions."""
        r = client.get("/positions")
        assert r.status_code == 200
        positions = r.json()
        assert isinstance(positions, list), "Should return a list"
        print(f"\n  Found {len(positions)} positions")

    def test_position_detail_returns_frac_tree(self):
        """GET /positions/{id}/detail should return full FRAC tree with competencies."""
        # First get any position
        r = client.get("/positions")
        assert r.status_code == 200
        positions = r.json()
        if not positions:
            pytest.skip("No positions in DB — seed first")

        pos_id = positions[0]["id"]
        r = client.get(f"/positions/{pos_id}/detail")
        assert r.status_code == 200, f"Position detail failed: {r.text}"

        data = r.json()
        assert "id" in data
        assert "title" in data
        assert "roles" in data
        assert "competencies" in data
        assert "total_competencies" in data
        assert isinstance(data["competencies"], list)
        assert isinstance(data["roles"], list)
        print(f"\n  Position '{data['title']}': {data['total_competencies']} competencies, {len(data['roles'])} roles")

    def test_position_detail_invalid_id_returns_404(self):
        """GET /positions/nonexistent/detail should return 404."""
        r = client.get("/positions/00000000-0000-0000-0000-000000000000/detail")
        assert r.status_code == 404

    def test_me_status_unauthenticated_returns_401(self):
        """GET /me/status without token should return 401."""
        r = client.get("/me/status")
        assert r.status_code == 401

    def test_me_status_authenticated(self):
        """GET /me/status with valid token returns onboarding state."""
        db = SessionLocal()
        try:
            learner = _get_or_create_test_learner(db)
            token = _token_for(learner.email)
        finally:
            db.close()

        r = client.get("/me/status", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert "onboarding_completed" in data
        assert "has_position" in data
        print(f"\n  Status: onboarding_completed={data.get('onboarding_completed')}, has_position={data.get('has_position')}")

    def test_onboarding_endpoint_unauthenticated_returns_401(self):
        """POST /auth/onboarding without token should return 401."""
        r = client.post("/auth/onboarding", json={
            "position_id": "00000000-0000-0000-0000-000000000000",
            "qualification": "Graduate",
            "experience_years": 2,
            "goal_timeline_months": 12,
            "learning_preference": "self-paced",
        })
        assert r.status_code == 401

    def test_onboarding_saves_profile(self):
        """POST /auth/onboarding should persist all wizard fields."""
        db = SessionLocal()
        try:
            learner = _get_or_create_test_learner(db)
            token = _token_for(learner.email)

            # Get a real position
            r = client.get("/positions")
            positions = r.json()
            if not positions:
                pytest.skip("No positions in DB")
            pos_id = positions[0]["id"]

            # Submit onboarding
            payload = {
                "position_id": pos_id,
                "qualification": "Graduate (B.A/B.Sc/B.Com/B.Tech)",
                "experience_years": 3.5,
                "career_goal": "Lead a district survey team within 2 years.",
                "goal_timeline_months": 12,
                "learning_preference": "guided",
                "self_assessment": {},
            }
            r = client.post(
                "/auth/onboarding",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 200, f"Onboarding failed: {r.text}"
            result = r.json()

            # Verify the response contains learner fields
            assert result.get("onboarding_completed") is True
            assert result.get("career_goal") == "Lead a district survey team within 2 years."
            assert result.get("goal_timeline_months") == 12
            assert result.get("learning_preference") == "guided"

            # Verify DB was actually updated
            db.expire_all()
            updated = db.query(Learner).filter(Learner.email == learner.email).first()
            assert updated.onboarding_completed is True
            assert updated.goal_timeline_months == 12
            assert updated.learning_preference == "guided"
            print("\n  Onboarding saved and verified in DB!")

        finally:
            # Cleanup test learner
            try:
                db.query(Learner).filter(
                    Learner.email == "onboarding_test@skilllens.in"
                ).delete()
                db.commit()
            except Exception:
                db.rollback()
            db.close()

    def test_onboarding_with_self_assessment(self):
        """POST /auth/onboarding with self_assessment should store scores."""
        db = SessionLocal()
        try:
            learner = _get_or_create_test_learner(db, email="onboarding_sa_test@skilllens.in")
            token = _token_for(learner.email)

            r = client.get("/positions")
            positions = r.json()
            if not positions:
                pytest.skip("No positions in DB")
            pos_id = positions[0]["id"]

            # Get competency IDs from FRAC detail
            r = client.get(f"/positions/{pos_id}/detail")
            detail = r.json()
            competencies = detail.get("competencies", [])

            # Build self-assessment with all competencies at level 2
            self_assessment = {c["id"]: 2 for c in competencies[:3]}

            payload = {
                "position_id": pos_id,
                "qualification": "Graduate (B.A/B.Sc/B.Com/B.Tech)",
                "experience_years": 1.0,
                "goal_timeline_months": 6,
                "learning_preference": "self-paced",
                "self_assessment": self_assessment,
            }

            r = client.post(
                "/auth/onboarding",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 200, f"Onboarding with self-assessment failed: {r.text}"
            result = r.json()
            assert result.get("onboarding_completed") is True
            print(f"\n  Self-assessment with {len(self_assessment)} competencies saved!")

        finally:
            try:
                db.query(Learner).filter(
                    Learner.email == "onboarding_sa_test@skilllens.in"
                ).delete()
                db.commit()
            except Exception:
                db.rollback()
            db.close()
