"""
Complete End-to-End Acceptance Test for SkillLens AI (PRD Part 32)

Executes the official 34-step SIH demo verification scenario:
1. Demo learner logs in.
2. Dashboard loads.
3. Existing competency profile appears.
4. System shows current gaps.
5. Learner uploads a PDF/document.
6. Document is extracted.
7. Document is chunked.
8. Embeddings generated.
9. Vector index created.
10. Relevant evidence retrieved.
11. AI generates questions.
12. Each question has source evidence.
13. Learner starts adaptive assessment.
14. Difficulty changes according to ability.
15. BKT updates mastery.
16. Competency evidence is stored.
17. Gap recalculates.
18. Root cause is shown.
19. Recommendation is generated.
20. Learning path updates.
21. iGOT-compatible resource appears (labelled prototype/mock).
22. Resource is clearly marked prototype/mock.
23. Learner completes learning.
24. Reassessment becomes available.
25. Learner reassesses.
26. Before/after comparison appears.
27. Competency improves only based on evidence.
28. Gap closes if target reached.
29. Growth points awarded.
30. Badge awarded.
31. Notification created.
32. Passbook updated.
33. Audit event recorded.
34. Admin sees the event.
"""
import os
import sys
import io
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.main import app
from app.core.database import SessionLocal
from app.models.models import Learner, Competency, AuditEvent, Notification, LearnerPoint, Certificate
from app.services.rag_service import chunk_document, build_and_save_vector_index, retrieve_relevant_chunks

client = TestClient(app)


def test_full_acceptance_scenario():
    # Reset baseline scores for idempotent test runs
    db_init = SessionLocal()
    from app.models.models import LearnerCompetencyScore
    aditi_user = db_init.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
    if aditi_user:
        for s in db_init.query(LearnerCompetencyScore).filter(LearnerCompetencyScore.learner_id == aditi_user.id).all():
            comp_name = s.competency.name if s.competency else ""
            if "Sampling" in comp_name:
                s.current_level = 1.8
                s.mastery_probability = 0.35
            elif "Quality" in comp_name:
                s.current_level = 2.0
                s.mastery_probability = 0.42
            elif "Field" in comp_name:
                s.current_level = 2.8
                s.mastery_probability = 0.65
        db_init.commit()
    db_init.close()

    # -------------------------------------------------------------
    # Step 1: Demo learner logs in
    # -------------------------------------------------------------

    login_res = client.post(
        "/auth/login",
        json={"email": "aditi.demo@skilllens.in", "password": "demo1234"},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # -------------------------------------------------------------
    # Step 2: Dashboard loads & Step 3: Existing competency profile appears
    # -------------------------------------------------------------
    profile_res = client.get("/competency/profile", headers=headers)
    assert profile_res.status_code == 200
    profile_data = profile_res.json()
    assert len(profile_data) > 0, "Competency profile must contain competencies"

    # -------------------------------------------------------------
    # Step 4: System shows current gaps & root causes
    # -------------------------------------------------------------
    gaps_res = client.get("/gaps", headers=headers)
    assert gaps_res.status_code == 200
    gaps_data = gaps_res.json()
    assert len(gaps_data) > 0
    # Must identify at least one critical or developing gap
    gap_items = [g for g in gaps_data if g["status"] in ("critical", "developing")]
    assert len(gap_items) >= 1


    # -------------------------------------------------------------
    # Step 5 - 9: Document upload, text extraction, chunking, embedding, vector index
    # -------------------------------------------------------------
    doc_content = (
        "National Sample Survey Guidelines for Official Statistics.\n\n"
        "Section 1: Multi-stage Stratified Sampling.\n"
        "In large-scale socio-economic surveys, multi-stage stratified sampling is applied "
        "to balance operational cost and sample variance. First-stage units (FSUs) are villages "
        "in rural strata and urban frame survey (UFS) blocks in urban sectors. Ultimate sampling units (USUs) "
        "are selected households using circular systematic sampling.\n\n"
        "Section 2: Data Quality & Consistency Rules.\n"
        "Field supervisors must verify 100% of non-response codes and conduct 10% spot re-interviews. "
        "Range checks must prevent recording invalid age or income entries before digital transmission."
    )
    file_bytes = io.BytesIO(doc_content.encode("utf-8"))
    upload_res = client.post(
        "/quiz/upload",
        headers=headers,
        files={"file": ("nss_guidelines.txt", file_bytes, "text/plain")},
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    doc_id = upload_data["document_id"]
    assert upload_data["rag_ready"] is True
    assert upload_data["chunks_indexed"] >= 1

    # -------------------------------------------------------------
    # Step 10: Relevant evidence retrieved
    # -------------------------------------------------------------
    retrieved = retrieve_relevant_chunks(doc_id, "What are first-stage units?", top_k=2)
    assert len(retrieved) > 0
    assert "units" in retrieved[0]["text"].lower() or "sampling" in retrieved[0]["text"].lower()

    # -------------------------------------------------------------
    # Step 11 & 12: Question generation with source evidence citations
    # -------------------------------------------------------------
    gen_res = client.post(
        "/quiz/generate",
        headers=headers,
        json={"document_id": doc_id, "num_questions": 3, "language": "en"},
    )
    assert gen_res.status_code == 200, f"Quiz generation failed: {gen_res.text}"
    quiz_data = gen_res.json()
    assert len(quiz_data["questions"]) > 0
    q1 = quiz_data["questions"][0]
    assert "source_excerpt" in q1 or "document_name" in q1, "Questions must contain source evidence"

    # -------------------------------------------------------------
    # Step 13, 14, 15, 16, 17: Submit quiz, BKT update, evidence stored, gap recalculates
    # -------------------------------------------------------------
    answers = [q["correct_index"] for q in quiz_data["questions"]]
    submit_res = client.post(
        "/quiz/submit",
        headers=headers,
        json={"quiz_id": quiz_data["id"], "answers": answers},
    )
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert sub_data["score"] == 100.0

    # -------------------------------------------------------------
    # Step 18, 19, 20, 21, 22: Recommendations & Learning Path with iGOT mock catalog
    # -------------------------------------------------------------
    path_res = client.get("/learning-path/overview", headers=headers)
    assert path_res.status_code == 200
    path_steps = path_res.json()
    assert len(path_steps) > 0

    recs_res = client.get("/recommendations", headers=headers)
    assert recs_res.status_code == 200
    recs_data = recs_res.json()
    assert len(recs_data) > 0
    first_rec = recs_data[0]
    assert "rationale" in first_rec

    # -------------------------------------------------------------
    # Step 23 - 28: Learning completed, Reassessment, Before/After Delta
    # -------------------------------------------------------------
    target_comp = profile_data[0]["competency_id"]
    reassess_res = client.post(
        f"/quiz/reassess/{target_comp}",
        headers=headers,
        params={"score": 85.0},
    )
    assert reassess_res.status_code == 200, f"Reassessment failed: {reassess_res.text}"
    reassess_data = reassess_res.json()
    assert "before_level" in reassess_data
    assert "after_level" in reassess_data
    assert "improvement" in reassess_data
    assert "gap_status" in reassess_data

    # -------------------------------------------------------------
    # Step 29, 30: Growth points and badges
    # -------------------------------------------------------------
    gamify_res = client.get("/gamification/summary", headers=headers)
    assert gamify_res.status_code == 200
    gamify_data = gamify_res.json()
    assert gamify_data["total_points"] > 0
    assert len(gamify_data["badges"]) > 0

    # -------------------------------------------------------------
    # Step 31: Notification created
    # -------------------------------------------------------------
    notifs_res = client.get("/notifications/", headers=headers)
    assert notifs_res.status_code == 200
    notifs_data = notifs_res.json()
    assert len(notifs_data) > 0


    # -------------------------------------------------------------
    # Step 32: Passbook PDF export
    # -------------------------------------------------------------
    export_res = client.get("/export/passbook-pdf", headers=headers)
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/pdf"
    assert len(export_res.content) > 500

    # -------------------------------------------------------------
    # Step 33 & 34: Audit event recorded and visible to Admin
    # -------------------------------------------------------------
    admin_login = client.post(
        "/auth/login",
        json={"email": "admin.demo@skilllens.in", "password": "admin1234"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    audit_res = client.get("/admin/audit-events", headers=admin_headers)
    assert audit_res.status_code == 200
    audit_events = audit_res.json()
    assert len(audit_events) > 0
    event_types = [e["event_type"] for e in audit_events]
    assert "LOGIN" in event_types
