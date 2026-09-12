import os
import sys

# Ensure backend directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.services.llm import _call_groq, generate_quiz_questions

content = (
    "In statistics, stratified sampling is a method of sampling from a population "
    "which can be partitioned into subpopulations. In statistical surveys, when "
    "subpopulations within an overall population vary, it could be advantageous to "
    "sample each subpopulation independently. Stratification is the process of "
    "dividing members of the population into homogeneous subgroups before sampling."
)

print("--- TEST 1: Direct Groq Call (_call_groq) ---")
try:
    groq_res = _call_groq(
        'Generate a single question in JSON: [{"question": "What is stratified sampling?", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "It samples subgroups.", "difficulty": "medium"}]'
    )
    print("Groq direct response type:", type(groq_res))
    print("Groq direct response preview:", groq_res)
    assert isinstance(groq_res, (dict, list)), "Groq result must be dict or list"
    print(">>> TEST 1 PASSED: Groq works directly!")
except Exception as e:
    print(">>> TEST 1 FAILED:", e)
    sys.exit(1)

print("\n--- TEST 2: Fallback to Groq when Gemini key is broken ---")
original_gemini_key = settings.GEMINI_API_KEY
try:
    # Intentionally break Gemini key
    settings.GEMINI_API_KEY = "BROKEN_GEMINI_KEY_FOR_TESTING"
    res = generate_quiz_questions(content, n=2, language="en")
    print("Returned questions count:", len(res))
    print("First question:", res[0].get("question"))
    assert len(res) == 2, "Should return 2 questions"
    print(">>> TEST 2 PASSED: Successfully fell through to Groq!")
finally:
    settings.GEMINI_API_KEY = original_gemini_key

print("\n--- TEST 3: Fallback to Offline when both Gemini and Groq are broken ---")
original_groq_key = settings.GROQ_API_KEY
try:
    settings.GEMINI_API_KEY = "BROKEN_KEY"
    settings.GROQ_API_KEY = "BROKEN_GROQ_KEY"
    res_offline = generate_quiz_questions(content, n=2, language="en")
    print("Offline questions count:", len(res_offline))
    print("First question:", res_offline[0].get("question"))
    assert len(res_offline) == 2, "Offline fallback should return 2 questions"
    print(">>> TEST 3 PASSED: Successfully fell through to deterministic offline fallback!")
finally:
    settings.GEMINI_API_KEY = original_gemini_key
    settings.GROQ_API_KEY = original_groq_key

print("\n--- ALL TASK 1 TESTS PASSED SUCCESSFULLY! ---")
