"""
test_quiz_end_to_end.py — Live E2E quiz test against a running server.
Requires: uvicorn app.main:app --reload --port 8000
"""
import os
import io
import sys
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:8000"

SKIP_MSG = (
    "\n⚠  Backend server not running at http://127.0.0.1:8000\n"
    "   Start it with: cd skilllens/backend && uvicorn app.main:app --reload --port 8000\n"
)


def check_server():
    try:
        return requests.get(f"{BASE}/", timeout=3).status_code == 200
    except Exception:
        return False


def test_quiz():
    if not check_server():
        print(SKIP_MSG)
        sys.exit(0)

    print("--- 1. Login as Aditi ---")
    r = requests.post(f"{BASE}/auth/login", json={"email": "aditi.demo@skilllens.in", "password": "demo1234"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Token received.")

    print("\n--- 2. Fetch Module ID ---")
    recs = requests.get(f"{BASE}/recommendations", headers=headers).json()
    assert len(recs) > 0, "No recommendations found"
    target_mod = recs[0]["module"]
    mod_id = target_mod["id"]
    print(f"Target Module: {target_mod['title']} (ID: {mod_id})")

    print("\n--- 3. Generate Quiz for Module via Gemini ---")
    gen_res = requests.post(
        f"{BASE}/quiz/generate",
        json={"module_id": mod_id, "num_questions": 3, "language": "en"},
        headers=headers,
        timeout=60,
    )
    assert gen_res.status_code == 200, f"Module quiz generation failed: {gen_res.text}"
    quiz_data = gen_res.json()
    quiz_id = quiz_data["id"]
    questions = quiz_data["questions"]
    print(f"SUCCESS! Generated Quiz ID {quiz_id} with {len(questions)} questions:")
    for i, q in enumerate(questions):
        print(f"  Q{i+1}: {q['question']}")
        print(f"      Options: {q['options']}")

    print("\n--- 4. Submit Answers ---")
    answers = [0] * len(questions)
    sub_res = requests.post(
        f"{BASE}/quiz/submit",
        json={"quiz_id": quiz_id, "answers": answers},
        headers=headers,
    )
    assert sub_res.status_code == 200, f"Submit failed: {sub_res.text}"
    result = sub_res.json()
    print(f"Result Score: {result['score']}% ({result['correct_count']}/{result['total']} correct)")

    print("\n--- 5. Test PDF Upload & Quiz Generation ---")
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    buf = io.BytesIO()
    doc_pdf = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Field Survey Data Collection Protocols", styles["Title"]),
        Spacer(1, 12),
        Paragraph(
            "Data quality assurance in field surveys requires standardized questionnaires, "
            "enumerator training, and systematic multi-stage supervision. "
            "Non-sampling errors are minimized through rigorous pre-testing and real-time validation checks.",
            styles["Normal"]
        ),
    ]
    doc_pdf.build(story)
    pdf_bytes = buf.getvalue()

    files = {"file": ("Survey_Protocols.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    up_res = requests.post(f"{BASE}/quiz/upload", files=files, headers=headers)
    assert up_res.status_code == 200, f"Upload failed: {up_res.text}"
    doc_id = up_res.json()["document_id"]
    print(f"Document uploaded! Doc ID: {doc_id}, chars extracted: {up_res.json()['chars_extracted']}")

    print("\n--- 6. Generate Quiz from Uploaded Document ---")
    doc_quiz_res = requests.post(
        f"{BASE}/quiz/generate",
        json={"document_id": doc_id, "num_questions": 3, "language": "en"},
        headers=headers,
        timeout=90,
    )
    assert doc_quiz_res.status_code == 200, f"Document quiz generation failed: {doc_quiz_res.text}"
    doc_quiz = doc_quiz_res.json()
    print(f"SUCCESS! Generated Doc Quiz ID {doc_quiz['id']} with {len(doc_quiz['questions'])} questions:")
    for i, q in enumerate(doc_quiz['questions']):
        print(f"  Doc Q{i+1}: {q['question']}")

    print("\n>>> ALL QUIZ & LLM TESTS PASSED 100% PERFECTLY! <<<")


if __name__ == "__main__":
    test_quiz()
