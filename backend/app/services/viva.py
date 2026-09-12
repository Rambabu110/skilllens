"""
Voice Viva (AI Oral Examination) Service.
Handles examiner question generation (Gemini -> Groq -> Offline Fallback),
audio transcription (Gemini multimodal with text fallback error handling),
and strict rubric-based oral answer evaluation.
"""
import json
import logging
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.services.llm import _call_llm, _extract_json

logger = logging.getLogger(__name__)


def _fallback_viva_questions(comp_name: str, comp_desc: str = "") -> List[Dict[str, Any]]:
    """Deterministic offline fallback for viva questions if all LLMs are unreachable."""
    name = comp_name or "Public Administration Competency"
    return [
        {
            "question_en": f"Explain the core principles of {name} and how you apply them in day-to-day public administration.",
            "question_hi": f"{name} के मुख्य सिद्धांतों और दैनिक सार्वजनिक प्रशासन में उनके उपयोग की व्याख्या करें।",
            "expected_points": [
                f"Core definition and institutional purpose of {name}",
                "Practical implementation in government workflow and citizen service delivery",
                "Adherence to compliance standards, transparency, and civil service ethics"
            ],
            "max_score": 10
        },
        {
            "question_en": f"Describe a real-world dilemma or operational bottleneck related to {name} and explain how you would resolve it.",
            "question_hi": f"{name} से संबंधित किसी परिचालन बाधा या समस्या का वर्णन करें और बताएं कि आप इसे कैसे हल करेंगे।",
            "expected_points": [
                "Identification of root causes, constraints, and stakeholder priorities",
                "Adherence to Standard Operating Procedures (SOPs) and statutory provisions",
                "Mitigation of operational risks and stakeholder communication"
            ],
            "max_score": 10
        },
        {
            "question_en": f"How would you ensure continuous quality audit, monitoring, and capacity building for {name} within your department?",
            "question_hi": f"आप अपने विभाग में {name} के लिए गुणवत्ता ऑडिट, निगरानी और क्षमता निर्माण कैसे सुनिश्चित करेंगे?",
            "expected_points": [
                "Measurable metrics, KPIs, and audit checkpoints",
                "Feedback loops, corrective actions, and team mentoring",
                "Inter-departmental alignment and digital record maintenance"
            ],
            "max_score": 10
        }
    ]


def generate_viva_questions(competency_name: str, competency_description: str = "") -> List[Dict[str, Any]]:
    """
    Generates 3 oral examination viva questions for the given competency using Gemini -> Groq -> fallback.
    Returns list of 3 dicts: [{question_en, question_hi, expected_points, max_score}].
    """
    prompt = f"""You are an elite government training examiner conducting an oral viva examination under India's Mission Karmayogi FRAC framework.

Target Competency:
- Name: {competency_name}
- Description: {competency_description or 'Government functional proficiency'}

Generate exactly 3 oral examination questions to test this competency in an oral viva format.
Requirements:
1. Provide both English ("question_en") and Hindi ("question_hi") versions for each question.
2. Formulate questions that test deep conceptual clarity, situational judgment, and administrative execution.
3. For each question, provide 3-4 specific "expected_points" (rubric points that candidate must mention).
4. Set "max_score": 10 for each question.

Respond ONLY with a valid JSON array of 3 objects in this exact format:
[
  {{
    "question_en": "Explain how...",
    "question_hi": "व्याख्या करें कि कैसे...",
    "expected_points": [
      "Point 1",
      "Point 2",
      "Point 3"
    ],
    "max_score": 10
  }}
]
"""
    try:
        raw_resp = _call_llm(prompt)
        data = _extract_json(raw_resp)
        if isinstance(data, list) and len(data) >= 3:
            validated = []
            for item in data[:3]:
                validated.append({
                    "question_en": str(item.get("question_en", "")).strip(),
                    "question_hi": str(item.get("question_hi", "")).strip(),
                    "expected_points": [str(p).strip() for p in item.get("expected_points", []) if str(p).strip()],
                    "max_score": 10,
                })
            if all(v["question_en"] and v["expected_points"] for v in validated):
                return validated
        logger.warning("LLM response format invalid for viva questions, falling back to deterministic template.")
    except Exception as e:
        logger.warning(f"All LLMs failed to generate viva questions ({e}). Using deterministic offline fallback.")

    return _fallback_viva_questions(competency_name, competency_description)


def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """
    Transcribes spoken Hindi/English audio verbatim using Gemini multimodal.
    If Gemini fails or is unreachable, raises an informative exception so caller/frontend
    can gracefully prompt for typed text without crashing.
    """
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured for audio transcription.")

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)

        models = ["gemini-1.5-flash", "gemini-flash-latest", "gemini-2.5-flash"]
        prompt = "Transcribe this Hindi/English oral examination answer verbatim. Do not add commentary or introductory text, only the transcript."

        # Normalize common audio mimes
        clean_mime = mime_type.split(";")[0].strip() if mime_type else "audio/webm"
        if not clean_mime:
            clean_mime = "audio/webm"

        audio_part = {
            "mime_type": clean_mime,
            "data": audio_bytes
        }

        last_err = None
        for m_name in models:
            try:
                model = genai.GenerativeModel(m_name)
                resp = model.generate_content([prompt, audio_part])
                if resp and resp.text:
                    transcript = resp.text.strip()
                    if transcript:
                        return transcript
            except Exception as e:
                last_err = e
                continue

        raise last_err or RuntimeError("Audio transcription yielded no text.")
    except Exception as e:
        logger.warning(f"Audio transcription failed: {e}")
        raise RuntimeError(f"Audio transcription failed ({e}). Please provide typed text instead.")


def _fallback_evaluate_answer(question: str, expected_points: List[str], transcript: str) -> Dict[str, Any]:
    """Deterministic offline evaluator based on keyword and semantic overlap."""
    clean_text = transcript.lower().strip()
    words = set(clean_text.split())

    covered = []
    missed = []

    for pt in expected_points:
        pt_words = [w.lower() for w in pt.replace(",", "").replace(".", "").split() if len(w) > 3]
        matches = [w for w in pt_words if w in clean_text]
        if len(matches) >= max(1, len(pt_words) // 3):
            covered.append(pt)
        else:
            missed.append(pt)

    if not expected_points:
        score = 5.0
    else:
        fraction = len(covered) / len(expected_points)
        score = round(fraction * 10.0, 1)

    # Minimum baseline for articulate response
    if len(words) >= 15 and score < 3.0:
        score = 3.0

    score = min(max(score, 1.0), 10.0)

    return {
        "score": score,
        "points_covered": covered,
        "points_missed": missed,
        "feedback_en": (
            f"Candidate scored {score}/10. Addressed {len(covered)} key rubric points. "
            + (f"Consider elaborating on: {', '.join(missed[:2])}." if missed else "Comprehensive answer covering all key aspects.")
        ),
        "feedback_hi": (
            f"उम्मीदवार ने {score}/10 अंक प्राप्त किए। {len(covered)} मुख्य बिंदु शामिल किए। "
            + (f"इन पहलुओं पर अधिक ध्यान दें: {', '.join(missed[:2])}।" if missed else "सभी प्रमुख पहलुओं को शामिल करते हुए व्यापक उत्तर।")
        )
    }


def evaluate_answer(question: str, expected_points: List[str], transcript: str) -> Dict[str, Any]:
    """
    Evaluates viva answer against expected points rubric.
    Calls LLM provider chain with strict JSON rubric prompt; falls back to deterministic evaluator.
    """
    if not transcript or not transcript.strip():
        return {
            "score": 0.0,
            "points_covered": [],
            "points_missed": expected_points,
            "feedback_en": "No answer was recorded or provided.",
            "feedback_hi": "कोई उत्तर दर्ज या प्रदान नहीं किया गया।"
        }

    prompt = f"""You are an objective oral examination rubric evaluator under the Karmayogi Competency Framework.
Assess the candidate's oral viva response against the expected criteria.

Question:
{question}

Expected Key Points to Cover:
{json.dumps(expected_points, indent=2)}

Candidate Transcript:
\"{transcript}\"

Evaluation Rules:
1. Score from 0.0 to 10.0.
2. Award points only if expected points are covered conceptually (synonyms and natural paraphrasing in Hindi or English are allowed).
3. Identify which specific points from expected_points were covered ("points_covered") and which were omitted ("points_missed").
4. Provide constructive feedback in English ("feedback_en") and Hindi ("feedback_hi").

Reply ONLY with valid JSON in this exact structure:
{{
  "score": 8.0,
  "points_covered": [
    "Point covered 1"
  ],
  "points_missed": [
    "Point missed 1"
  ],
  "feedback_en": "Concise feedback in English...",
  "feedback_hi": "संक्षिप्त प्रतिक्रिया हिंदी में..."
}}
"""
    try:
        raw_resp = _call_llm(prompt)
        data = _extract_json(raw_resp)
        if isinstance(data, dict) and "score" in data:
            score = float(data.get("score", 5.0))
            score = min(max(score, 0.0), 10.0)
            return {
                "score": round(score, 1),
                "points_covered": [str(p) for p in data.get("points_covered", [])],
                "points_missed": [str(p) for p in data.get("points_missed", [])],
                "feedback_en": str(data.get("feedback_en", "Assessment completed.")),
                "feedback_hi": str(data.get("feedback_hi", "मूल्यांकन पूरा हुआ।")),
            }
    except Exception as e:
        logger.warning(f"LLM rubric evaluation failed ({e}). Using deterministic offline evaluator.")

    return _fallback_evaluate_answer(question, expected_points, transcript)
