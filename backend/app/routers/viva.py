"""
Voice Viva (AI Oral Examination) Router.
Provides oral examination sessions for Mission Karmayogi competencies.
Supports audio recording uploads (Gemini multimodal transcription) with typed-text fallback,
rubric-based evaluation, and EMA/BKT competency intelligence integration.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner, Competency, VivaSession
from app.schemas.schemas import (
    VivaStartRequest, VivaSessionOut, VivaQuestionItem,
    VivaAnswerResponse, VivaFinishOut,
)
from app.services.viva import generate_viva_questions, transcribe_audio, evaluate_answer
from app.services.competency import apply_quiz_result_to_competencies

router = APIRouter(prefix="/viva", tags=["viva"])


@router.post("/start", response_model=VivaSessionOut)
def start_viva_session(
    req: VivaStartRequest,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """
    Initiates a 3-question AI oral examination session for the target competency.
    """
    comp = db.query(Competency).filter(Competency.id == req.competency_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competency not found.")

    questions = generate_viva_questions(comp.name, comp.description or "")

    session = VivaSession(
        learner_id=current.id,
        competency_id=comp.id,
        questions=questions,
        scores={},
        status="in_progress",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return VivaSessionOut(
        session_id=session.id,
        competency_id=comp.id,
        competency_name=comp.name,
        questions=[VivaQuestionItem(**q) for q in questions],
        status=session.status,
        scores=session.scores or {},
    )


@router.post("/{session_id}/answer/{question_index}", response_model=VivaAnswerResponse)
async def answer_viva_question(
    session_id: str,
    question_index: int,
    audio_file: Optional[UploadFile] = File(None),
    text_answer: Optional[str] = Form(None),
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """
    Receives candidate answer as audio blob (transcribed via Gemini) or typed text fallback.
    Evaluates response against expected rubric points and returns score + feedback.
    """
    session = (
        db.query(VivaSession)
        .filter(VivaSession.id == session_id, VivaSession.learner_id == current.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Viva session not found.")

    questions = session.questions or []
    if question_index < 0 or question_index >= len(questions):
        raise HTTPException(status_code=400, detail=f"Invalid question index {question_index}.")

    target_q = questions[question_index]
    transcript = ""

    if audio_file:
        raw_bytes = await audio_file.read()
        if len(raw_bytes) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Audio file exceeds maximum allowed size of 10MB."
            )
        try:
            mime = audio_file.content_type or "audio/webm"
            transcript = transcribe_audio(raw_bytes, mime)
        except Exception as e:
            if text_answer and text_answer.strip():
                transcript = text_answer.strip()
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Audio transcription was unsuccessful: {e}. Please use the text input fallback."
                )
    elif text_answer and text_answer.strip():
        transcript = text_answer.strip()
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide an audio recording or typed text answer."
        )

    # Evaluate answer against rubric
    expected_pts = target_q.get("expected_points", [])
    eval_result = evaluate_answer(target_q.get("question_en", ""), expected_pts, transcript)

    # Persist score and answer into session.scores
    current_scores = dict(session.scores or {})
    current_scores[str(question_index)] = {
        "transcript": transcript,
        "score": eval_result["score"],
        "points_covered": eval_result["points_covered"],
        "points_missed": eval_result["points_missed"],
        "feedback_en": eval_result["feedback_en"],
        "feedback_hi": eval_result["feedback_hi"],
    }
    session.scores = current_scores
    db.commit()

    return VivaAnswerResponse(
        question_index=question_index,
        transcript=transcript,
        score=eval_result["score"],
        points_covered=eval_result["points_covered"],
        points_missed=eval_result["points_missed"],
        feedback_en=eval_result["feedback_en"],
        feedback_hi=eval_result["feedback_hi"],
    )


@router.post("/{session_id}/finish", response_model=VivaFinishOut)
def finish_viva_session(
    session_id: str,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """
    Finalizes viva examination, calculates overall score, feeds result into existing
    EMA and BKT competency models, and returns comprehensive bilingual report.
    """
    session = (
        db.query(VivaSession)
        .filter(VivaSession.id == session_id, VivaSession.learner_id == current.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Viva session not found.")

    comp = db.query(Competency).filter(Competency.id == session.competency_id).first()
    comp_name = comp.name if comp else "Competency"

    scores_dict = session.scores or {}
    questions = session.questions or []

    breakdown = []
    total_score = 0.0
    evaluated_count = 0

    for idx, q in enumerate(questions):
        entry = scores_dict.get(str(idx), {})
        sc = float(entry.get("score", 0.0))
        total_score += sc
        evaluated_count += 1
        breakdown.append({
            "question_index": idx,
            "question_en": q.get("question_en", ""),
            "question_hi": q.get("question_hi", ""),
            "transcript": entry.get("transcript", "Not answered"),
            "score": sc,
            "points_covered": entry.get("points_covered", []),
            "points_missed": entry.get("points_missed", []),
            "feedback_en": entry.get("feedback_en", "Pending evaluation"),
            "feedback_hi": entry.get("feedback_hi", "मूल्यांकन लंबित"),
        })

    avg_score = round(total_score / max(1, evaluated_count), 1)
    score_pct = round((avg_score / 10.0) * 100.0, 1)

    # Feed through existing EMA & BKT updates
    apply_quiz_result_to_competencies(db, current, [session.competency_id], score_pct)

    session.status = "complete"
    db.commit()

    if avg_score >= 8.0:
        overall_en = f"Outstanding oral proficiency in {comp_name}. Demonstrated comprehensive mastery and situational judgment."
        overall_hi = f"{comp_name} में उत्कृष्ट मौखिक दक्षता। व्यापक महारत और स्थितिजन्य निर्णय क्षमता का प्रदर्शन किया।"
    elif avg_score >= 5.0:
        overall_en = f"Satisfactory operational knowledge in {comp_name}. Reinforcing identified rubric gaps will elevate proficiency."
        overall_hi = f"{comp_name} में संतोषजनक व्यावहारिक ज्ञान। छूटे हुए बिंदुओं पर सुधार करने से दक्षता में वृद्धि होगी।"
    else:
        overall_en = f"Developing oral foundation in {comp_name}. Recommend reviewing recommended training modules."
        overall_hi = f"{comp_name} में प्रारंभिक स्तर। अनुशंसित प्रशिक्षण मॉड्यूल का अध्ययन करने का सुझाव दिया जाता है।"

    return VivaFinishOut(
        session_id=session.id,
        competency_id=session.competency_id,
        competency_name=comp_name,
        average_score=avg_score,
        score_percent=score_pct,
        breakdown=breakdown,
        overall_feedback_en=overall_en,
        overall_feedback_hi=overall_hi,
    )
