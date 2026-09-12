"""
Phase 2 — trains the competency-level model on OULAD-derived features
and serializes it for the FastAPI service to load at runtime.

Uses GradientBoostingRegressor (not classifier) because competency_level
is a continuous 1-5 scale, not discrete classes — a regressor gives
smoother, more defensible "current_level: 3.2" outputs than forcing bins.
"""
import joblib
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

DATA = Path(__file__).resolve().parent.parent / "data"
MODEL_DIR = Path(__file__).resolve().parent.parent / "app" / "ml" / "artifacts"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "total_clicks", "engagement_index", "active_days",
    "avg_assessment_score", "num_assessments",
    "num_of_prev_attempts", "studied_credits",
]


def main():
    df = pd.read_csv(DATA / "training_features.csv")
    X = df[FEATURE_COLS]
    y = df["competency_level"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=200, max_depth=3, learning_rate=0.05, random_state=42
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"Test MAE: {mae:.3f}  |  R2: {r2:.3f}")

    importances = dict(zip(FEATURE_COLS, model.feature_importances_))
    print("Feature importances (keep this for the judge Q&A slide):")
    for k, v in sorted(importances.items(), key=lambda x: -x[1]):
        print(f"  {k:25s} {v:.3f}")

    joblib.dump({"model": model, "feature_cols": FEATURE_COLS}, MODEL_DIR / "competency_model.joblib")
    print(f"Saved model to {MODEL_DIR / 'competency_model.joblib'}")


if __name__ == "__main__":
    main()
