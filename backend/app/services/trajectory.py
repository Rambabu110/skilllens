"""
Advanced feature #4: Competency Trajectory Forecasting.

Deliberately simple and explainable: uses the learner's quiz-attempt
history to estimate an improvement rate, then linearly projects when
each critical gap would close at that rate. This is presented honestly
as a heuristic projection (clearly labeled), not a deep time-series
model -- overclaiming here would hurt credibility more than a clearly-
scoped simple model helps.
"""
from sqlalchemy.orm import Session

from app.models.models import QuizAttempt


def estimate_weeks_to_close(db: Session, learner_id: str, gap_size: float) -> dict:
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.learner_id == learner_id)
        .order_by(QuizAttempt.submitted_at)
        .all()
    )

    if len(attempts) < 2:
        return {
            "estimable": False,
            "reason": "Not enough quiz history yet to estimate a trend "
                      "(need at least 2 completed assessments).",
        }

    # Improvement rate proxy: average score delta between consecutive
    # attempts, translated to an implied competency-level delta per
    # attempt (scores are 0-100, levels are 0-5).
    deltas = []
    for i in range(1, len(attempts)):
        score_delta = attempts[i].score - attempts[i - 1].score
        deltas.append(score_delta / 100.0 * 5.0)

    avg_delta_per_attempt = sum(deltas) / len(deltas)

    if avg_delta_per_attempt <= 0.05:
        return {
            "estimable": True,
            "trend": "flat_or_declining",
            "message": "Recent assessments show little improvement -- consider "
                       "a different learning module or more attempts before this gap closes.",
        }

    # Assume roughly one attempt per week of active engagement -- a
    # transparent modeling assumption, stated plainly.
    attempts_needed = gap_size / avg_delta_per_attempt
    weeks = max(1, round(attempts_needed))

    return {
        "estimable": True,
        "trend": "improving",
        "avg_level_gain_per_attempt": round(avg_delta_per_attempt, 2),
        "estimated_weeks_to_close_gap": weeks,
        "assumption": "Based on your recent assessment trend, assuming roughly one assessment per week.",
    }
