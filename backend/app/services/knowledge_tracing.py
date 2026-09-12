"""
Bayesian Knowledge Tracing (BKT) Service.
Maintains continuous mastery probability P(L_t) per learner-competency pair,
additive to the existing Exponential Moving Average (EMA) scoring.
"""
from typing import Optional, List, Dict
import math
from sqlalchemy.orm import Session

from app.models.models import Quiz, QuizAttempt

# Module-level default parameters
P_INIT = 0.30
P_LEARN = 0.15
P_GUESS = 0.25
P_SLIP = 0.10


def update_mastery(
    p_prev: Optional[float],
    correct: bool,
    p_learn: float = P_LEARN,
    p_guess: float = P_GUESS,
    p_slip: float = P_SLIP,
) -> float:
    """
    Standard BKT update rule:
    1. Calculate posterior probability of mastery given evidence:
       - If correct: P(L|obs) = (P_prev * (1 - P_slip)) / (P_prev * (1 - P_slip) + (1 - P_prev) * P_guess)
       - If wrong:   P(L|obs) = (P_prev * P_slip) / (P_prev * P_slip + (1 - P_prev) * (1 - P_guess))
    2. Apply learning transition:
       P_new = P(L|obs) + (1 - P(L|obs)) * P_learn
    3. Clamped to [0.01, 0.99]
    """
    if p_prev is None:
        p_prev = P_INIT
    p_prev = float(min(max(p_prev, 0.01), 0.99))

    if correct:
        num = p_prev * (1.0 - p_slip)
        denom = num + (1.0 - p_prev) * p_guess
    else:
        num = p_prev * p_slip
        denom = num + (1.0 - p_prev) * (1.0 - p_guess)

    p_correct_given_mastered = num / denom if denom > 0 else p_prev
    p_new = p_correct_given_mastered + (1.0 - p_correct_given_mastered) * p_learn

    # Clamp to [0.01, 0.99]
    return round(float(min(max(p_new, 0.01), 0.99)), 4)


def fit_params_for_competency(db: Session, competency_id: str) -> Dict[str, float]:
    """
    If quiz attempts exist targeting this competency, perform a grid search
    over p_guess and p_slip (0.10 to 0.40, step 0.05) to find maximum likelihood
    estimates. Otherwise return module defaults.
    """
    defaults = {
        "p_init": P_INIT,
        "p_learn": P_LEARN,
        "p_guess": P_GUESS,
        "p_slip": P_SLIP,
    }

    try:
        # Find quizzes tagged with this competency
        quizzes = db.query(Quiz).all()
        matching_quiz_ids = []
        for q in quizzes:
            tags = q.competency_tags or []
            if competency_id in tags:
                matching_quiz_ids.append(q.id)

        if not matching_quiz_ids:
            return defaults

        attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.quiz_id.in_(matching_quiz_ids))
            .all()
        )

        if not attempts:
            return defaults

        # Extract sequence of correctness indicators from attempts
        # score >= 60% treated as overall correct signal for the competency attempt
        observations = [attempt.score >= 60.0 for attempt in attempts]
        if len(observations) < 3:
            return defaults

        best_ll = -float("inf")
        best_guess = P_GUESS
        best_slip = P_SLIP

        # Grid search: 0.1 to 0.4 in steps of 0.05
        guess_candidates = [round(x * 0.05, 2) for x in range(2, 9)]  # 0.10 to 0.40
        slip_candidates = [round(x * 0.05, 2) for x in range(2, 9)]

        for g in guess_candidates:
            for s in slip_candidates:
                ll = 0.0
                p_curr = P_INIT
                for obs in observations:
                    # P(Obs=1) = p_curr*(1-s) + (1-p_curr)*g
                    p_obs_1 = p_curr * (1.0 - s) + (1.0 - p_curr) * g
                    p_obs_1 = min(max(p_obs_1, 1e-4), 1.0 - 1e-4)

                    if obs:
                        ll += math.log(p_obs_1)
                        # Posterior update
                        p_cond = (p_curr * (1.0 - s)) / p_obs_1
                    else:
                        ll += math.log(1.0 - p_obs_1)
                        p_cond = (p_curr * s) / (1.0 - p_obs_1)

                    # Transition
                    p_curr = min(max(p_cond + (1.0 - p_cond) * P_LEARN, 0.01), 0.99)

                if ll > best_ll:
                    best_ll = ll
                    best_guess = g
                    best_slip = s

        return {
            "p_init": P_INIT,
            "p_learn": P_LEARN,
            "p_guess": best_guess,
            "p_slip": best_slip,
        }

    except Exception:
        return defaults
