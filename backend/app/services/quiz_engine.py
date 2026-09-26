"""
Computerized Adaptive Testing (CAT) Quiz Engine.
Maintains adaptive state (theta ability parameter, dynamic question routing by difficulty 1-5,
convergence detection, and competency profile feedback).
"""
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.models import Learner, Quiz, QuizAttempt, LearnerCompetencyScore
from app.services.competency import apply_quiz_result_to_competencies

# In-memory session store for active adaptive quizzes
ADAPTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}


def start_adaptive_session(quiz: Quiz, learner_id: str, max_questions: int = 5) -> Dict[str, Any]:
    """
    Initializes a new adaptive quiz session starting at theta = 3.0 (mid-scale 1-5).
    Selects the first question closest to difficulty 3.
    """
    session_id = str(uuid.uuid4())
    questions = quiz.questions or []
    if not questions:
        raise ValueError("Quiz has no questions available.")

    initial_theta = 3.0
    target_count = max(1, min(max_questions, len(questions)))

    # Pick question with difficulty closest to 3.0
    best_idx = 0
    min_dist = float("inf")
    for idx, q in enumerate(questions):
        diff = q.get("difficulty", 3)
        dist = abs(diff - initial_theta)
        if dist < min_dist:
            min_dist = dist
            best_idx = idx

    first_q = questions[best_idx]

    ADAPTIVE_SESSIONS[session_id] = {
        "session_id": session_id,
        "quiz_id": quiz.id,
        "learner_id": learner_id,
        "theta": initial_theta,
        "asked_indices": [best_idx],
        "history": [],
        "delta_history": [],
        "pool": questions,
        "max_questions": target_count,
        "competency_tags": quiz.competency_tags or [],
    }

    return {
        "session_id": session_id,
        "quiz_id": quiz.id,
        "status": "in_progress",
        "theta": initial_theta,
        "current_difficulty": first_q.get("difficulty", 3),
        "question_index": best_idx,
        "question": {
            "question": first_q["question"],
            "options": first_q["options"],
            "difficulty": first_q.get("difficulty", 3),
        },
        "questions_answered": 0,
        "max_questions": target_count,
        "total_pool_size": len(questions),
    }


def process_adaptive_answer(
    db: Session,
    session_id: str,
    question_index: int,
    selected_option: int,
    current_learner: Learner,
) -> Dict[str, Any]:
    """
    Processes user's answer, adjusts ability theta, checks for convergence,
    and returns either the next adaptively picked question or the final certified results.
    """
    session = ADAPTIVE_SESSIONS.get(session_id)
    if not session:
        raise KeyError("Adaptive quiz session not found or expired.")

    questions = session["pool"]
    if question_index < 0 or question_index >= len(questions):
        raise IndexError("Invalid question index.")

    q = questions[question_index]
    is_correct = bool(selected_option == q["correct_index"])
    q_diff = float(q.get("difficulty", 3))
    prev_theta = session["theta"]

    # Adaptive formula:
    # Base adjustment is 0.4, modulated by (q_diff - prev_theta) * 0.2
    # If correct on a hard question, theta increases more.
    # If incorrect on an easy question, theta decreases more.
    diff_gap = q_diff - prev_theta
    if is_correct:
        step = max(0.08, 0.4 + 0.2 * diff_gap)
        new_theta = prev_theta + step
    else:
        step = max(0.08, 0.4 - 0.2 * diff_gap)
        new_theta = prev_theta - step

    new_theta = float(min(max(new_theta, 0.0), 5.0))
    delta = abs(new_theta - prev_theta)

    session["delta_history"].append(delta)
    session["theta"] = new_theta

    session["history"].append({
        "question": q["question"],
        "options": q["options"],
        "your_answer": selected_option,
        "correct_answer": q["correct_index"],
        "is_correct": is_correct,
        "explanation": q["explanation"],
        "difficulty": int(q_diff),
        "theta_after": round(new_theta, 2),
    })

    asked = set(session["asked_indices"])
    remaining_indices = [i for i in range(len(questions)) if i not in asked]

    # Convergence check: |change in theta| < 0.1 for 3 consecutive questions
    delta_hist = session["delta_history"]
    converged = len(delta_hist) >= 3 and all(d < 0.1 for d in delta_hist[-3:])
    exhausted = len(remaining_indices) == 0
    max_target = session.get("max_questions") or min(10, len(questions))
    max_questions_reached = len(session["history"]) >= min(max_target, len(questions))

    if converged or exhausted or max_questions_reached:
        # Quiz Complete!
        final_theta = round(session["theta"], 2)
        score_pct = round((final_theta / 5.0) * 100.0, 1)

        # Record attempt in database
        answers_list = [h["your_answer"] for h in session["history"]]
        attempt = QuizAttempt(
            learner_id=current_learner.id,
            quiz_id=session["quiz_id"],
            answers=answers_list,
            score=score_pct,
        )
        db.add(attempt)
        db.commit()

        # Feed final theta through existing EMA and BKT updates in competency.py
        if session["competency_tags"]:
            apply_quiz_result_to_competencies(db, current_learner, session["competency_tags"], score_pct)

            # Also update ability_theta and questions_asked on LearnerCompetencyScore
            for comp_id in session["competency_tags"]:
                row = (
                    db.query(LearnerCompetencyScore)
                    .filter(
                        LearnerCompetencyScore.learner_id == current_learner.id,
                        LearnerCompetencyScore.competency_id == comp_id,
                    )
                    .first()
                )
                if row:
                    row.ability_theta = final_theta
                    row.questions_asked = (row.questions_asked or 0) + len(session["history"])
            db.commit()

        # Compute difficulty distribution
        diff_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for h in session["history"]:
            d = h["difficulty"]
            diff_counts[d] = diff_counts.get(d, 0) + 1

        confidence_label = (
            "High Confidence (Converged)"
            if converged
            else "Moderate Confidence (Pool Exhausted)"
        )

        result_payload = {
            "status": "quiz_complete",
            "final_theta": final_theta,
            "score_percent": score_pct,
            "converged": converged,
            "confidence_of_estimate": confidence_label,
            "questions_answered_count": len(session["history"]),
            "difficulty_distribution": diff_counts,
            "breakdown": session["history"],
            "last_answer_correct": is_correct,
            "last_explanation": q["explanation"],
        }

        # Clean up session
        ADAPTIVE_SESSIONS.pop(session_id, None)
        return result_payload

    # Pick next question closest to new theta
    best_next_idx = remaining_indices[0]
    min_dist = float("inf")
    for idx in remaining_indices:
        q_item = questions[idx]
        d_val = float(q_item.get("difficulty", 3))
        dist = abs(d_val - new_theta)
        if dist < min_dist:
            min_dist = dist
            best_next_idx = idx

    session["asked_indices"].append(best_next_idx)
    next_q = questions[best_next_idx]
    next_diff = int(next_q.get("difficulty", 3))

    diff_trend = "harder" if next_diff > q_diff else ("easier" if next_diff < q_diff else "same")

    return {
        "status": "in_progress",
        "session_id": session_id,
        "theta": round(new_theta, 2),
        "current_difficulty": next_diff,
        "difficulty_trend": diff_trend,
        "question_index": best_next_idx,
        "question": {
            "question": next_q["question"],
            "options": next_q["options"],
            "difficulty": next_diff,
        },
        "questions_answered": len(session["history"]),
        "max_questions": max_target,
        "last_answer_correct": is_correct,
        "last_explanation": q["explanation"],
    }
