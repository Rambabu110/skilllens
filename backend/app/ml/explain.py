"""
Explainable AI layer (advanced feature #1).

Wraps the trained GradientBoostingRegressor with a SHAP TreeExplainer so
every competency-level prediction can be broken down into "which factors
pushed this score up or down, and by how much" -- turning the model from
a black box into something defensible in a judge Q&A.
"""
from functools import lru_cache

import numpy as np
import pandas as pd
import shap

from app.ml.inference import _load

FEATURE_LABELS = {
    "total_clicks": "Overall platform engagement",
    "engagement_index": "Average session engagement",
    "active_days": "Days actively engaged",
    "avg_assessment_score": "Past assessment performance",
    "num_assessments": "Number of assessments completed",
    "num_of_prev_attempts": "Prior attempts at this material",
    "studied_credits": "Breadth of study load",
}


@lru_cache(maxsize=1)
def _explainer():
    model, feature_cols = _load()
    return shap.TreeExplainer(model), feature_cols


def explain_prediction(features: dict) -> dict:
    """
    Returns the base rate plus each feature's signed contribution to this
    specific learner's predicted competency level, sorted by magnitude.
    """
    explainer, feature_cols = _explainer()
    x = pd.DataFrame([[features.get(c, 0) for c in feature_cols]], columns=feature_cols)
    shap_values = explainer.shap_values(x)[0]
    base_value = float(np.ravel(explainer.expected_value)[0])

    contributions = []
    for i, col in enumerate(feature_cols):
        contributions.append({
            "factor": FEATURE_LABELS.get(col, col),
            "contribution": round(float(shap_values[i]), 3),
            "direction": "raises" if shap_values[i] >= 0 else "lowers",
        })
    contributions.sort(key=lambda c: -abs(c["contribution"]))

    return {
        "base_rate": round(base_value, 2),
        "contributions": contributions,
        "predicted_level": round(base_value + float(np.sum(shap_values)), 2),
    }
