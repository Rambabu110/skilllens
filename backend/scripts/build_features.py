"""
Phase 2 — turns raw OULAD CSVs into a per-student feature table used to
train the competency-level classifier.

Real signal used (all genuine OULAD columns, no fabrication):
  - engagement_index   : mean daily VLE clicks (studentVle.sum_click)
  - total_clicks       : total VLE interaction volume
  - avg_assessment_score: mean score across studentAssessment
  - num_assessments     : count of assessments attempted
  - prev_attempts       : num_of_prev_attempts (studentInfo)
  - studied_credits     : studentInfo.studied_credits
  - final_result        : label source -> mapped to a 0-5 "competency level"

final_result (Distinction/Pass/Fail/Withdrawn) is OULAD's real outcome
label. We map it to a 0-5 scale to stand in for "demonstrated competency
level" — this mapping is a modeling assumption, stated explicitly, not
a hidden fabrication.
"""
import pandas as pd
import numpy as np
from pathlib import Path

ARCHIVE_DIR = Path(__file__).resolve().parent.parent.parent / "archive"
RAW = ARCHIVE_DIR if ARCHIVE_DIR.exists() else (Path(__file__).resolve().parent.parent.parent.parent / "data" / "oulad_raw")
OUT = Path(__file__).resolve().parent.parent / "data"
OUT.mkdir(parents=True, exist_ok=True)

RESULT_TO_LEVEL = {
    "Distinction": 5.0,
    "Pass": 3.5,
    "Fail": 1.5,
    "Withdrawn": 1.0,
}


def main():
    student_info = pd.read_csv(RAW / "studentInfo.csv")
    student_assessment = pd.read_csv(RAW / "studentAssessment.csv")
    student_vle = pd.read_csv(RAW / "studentVle.csv")

    # --- engagement features from clickstream ---
    vle_agg = (
        student_vle.groupby("id_student")["sum_click"]
        .agg(total_clicks="sum", engagement_index="mean", active_days="count")
        .reset_index()
    )

    # --- assessment performance features ---
    assess_agg = (
        student_assessment.groupby("id_student")["score"]
        .agg(avg_assessment_score="mean", num_assessments="count")
        .reset_index()
    )

    df = student_info.merge(vle_agg, on="id_student", how="left")
    df = df.merge(assess_agg, on="id_student", how="left")

    df["total_clicks"] = df["total_clicks"].fillna(0)
    df["engagement_index"] = df["engagement_index"].fillna(0)
    df["active_days"] = df["active_days"].fillna(0)
    df["avg_assessment_score"] = df["avg_assessment_score"].fillna(df["avg_assessment_score"].median())
    df["num_assessments"] = df["num_assessments"].fillna(0)

    df["competency_level"] = df["final_result"].map(RESULT_TO_LEVEL)
    df = df.dropna(subset=["competency_level"])

    feature_cols = [
        "total_clicks", "engagement_index", "active_days",
        "avg_assessment_score", "num_assessments",
        "num_of_prev_attempts", "studied_credits",
    ]

    final = df[["id_student"] + feature_cols + ["competency_level"]].drop_duplicates(subset=["id_student"])
    final.to_csv(OUT / "training_features.csv", index=False)
    print(f"Wrote {len(final)} rows to {OUT / 'training_features.csv'}")
    print(final.describe())


if __name__ == "__main__":
    main()
