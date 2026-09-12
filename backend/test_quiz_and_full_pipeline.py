import requests
import io

BASE = "http://127.0.0.1:8000"

def run_tests():
    print("--- 1. Testing System & Login ---")
    r = requests.post(f"{BASE}/auth/login", json={"email": "aditi.demo@skilllens.in", "password": "demo1234"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Login successful, JWT token obtained.")

    print("\n--- 2. Testing Recommendations & Getting Module ---")
    r = requests.get(f"{BASE}/recommendations", headers=headers)
    assert r.status_code == 200, f"Recommendations failed: {r.text}"
    recs = r.json()
    assert len(recs) > 0, "No recommendations returned"
    first_mod_id = recs[0]["module"]["id"]
    first_mod_title = recs[0]["module"]["title"]
    print(f"[OK] Found recommended module: '{first_mod_title}' (ID: {first_mod_id})")

    print(f"\n--- 3. Testing Quiz Generation for Module ({first_mod_title}) ---")
    payload = {
        "module_id": first_mod_id,
        "num_questions": 3,
        "language": "en"
    }
    r = requests.post(f"{BASE}/quiz/generate", json=payload, headers=headers, timeout=60)
    assert r.status_code == 200, f"Module Quiz generate failed ({r.status_code}): {r.text}"
    quiz_data = r.json()
    assert "questions" in quiz_data and len(quiz_data["questions"]) > 0, "No questions returned"
    print(f"[OK] Generated {len(quiz_data['questions'])} questions for module. Title: '{quiz_data.get('title')}'")
    print(f"  Sample Q1: {quiz_data['questions'][0]['question']}")

    print("\n--- 4. Testing Quiz Submission ---")
    quiz_id = quiz_data["id"]
    answers = [0] * len(quiz_data["questions"])
    sub_payload = {
        "quiz_id": quiz_id,
        "answers": answers
    }
    r = requests.post(f"{BASE}/quiz/submit", json=sub_payload, headers=headers)
    assert r.status_code == 200, f"Quiz submit failed: {r.text}"
    res = r.json()
    print(f"[OK] Quiz submitted successfully. Score: {res['score']}%, Breakdown items: {len(res['breakdown'])}")

    print("\n--- 5. Testing PDF Document Upload (Basic_English_Grammar_Book_1.pdf) ---")
    with open("../Basic_English_Grammar_Book_1.pdf", "rb") as f:
        pdf_bytes = f.read()
    
    files = {"file": ("Basic_English_Grammar_Book_1.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    r = requests.post(f"{BASE}/quiz/upload", files=files, headers=headers)
    assert r.status_code == 200, f"Upload failed: {r.text}"
    up_data = r.json()
    doc_id = up_data["document_id"]
    chars = up_data["chars_extracted"]
    print(f"[OK] PDF uploaded successfully. Doc ID: {doc_id}, Extracted chars: {chars}")

    print("\n--- 6. Testing Quiz Generation from Uploaded PDF Document ---")
    doc_payload = {
        "document_id": doc_id,
        "num_questions": 3,
        "language": "en"
    }
    r = requests.post(f"{BASE}/quiz/generate", json=doc_payload, headers=headers, timeout=90)
    assert r.status_code == 200, f"PDF Quiz generate failed ({r.status_code}): {r.text}"
    pdf_quiz = r.json()
    assert "questions" in pdf_quiz and len(pdf_quiz["questions"]) > 0
    print(f"[OK] Generated {len(pdf_quiz['questions'])} questions from PDF. Title: '{pdf_quiz.get('title')}'")
    print(f"  Sample Q1: {pdf_quiz['questions'][0]['question']}")

    print("\n========================================================")
    print(">>> ALL PIPELINE & QUIZ GENERATION TESTS PASSED 100%! <<<")
    print("========================================================")

if __name__ == "__main__":
    run_tests()
