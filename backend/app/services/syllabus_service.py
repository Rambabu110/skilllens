"""
Syllabus & Assessment Pattern Watch — Prototype (PRD Part 14)

Enables civil service training administrators to track curriculum shifts:
Uploads Syllabus v1 and Syllabus v2, parses structured topics and competencies,
and generates a differential analysis:
- ADDED topics/competencies
- REMOVED topics/competencies
- MODIFIED topics/competencies
- UNCHANGED topics/competencies

Identifies affected questions in the assessment bank and flags them for REVIEW.
"""
from typing import Dict, List, Any, Optional
import re
import json
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import SyllabusVersion, QuestionVersion, Competency, Quiz


def parse_syllabus_text(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parses unstructured or bulleted syllabus text into structured topic items:
    [{topic: str, competency: str, weightage: int, section: str}]
    """
    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
    items = []
    current_section = "General Curriculum"

    for line in lines:
        # Check if line is a section header (e.g., "Module 1:", "Section A:")
        if line.lower().startswith(("unit", "module", "section", "part", "chapter")):
            current_section = line.split(":", 1)[0].strip()
            continue

        # Extract topic name and possible weightage
        clean_line = re.sub(r"^[0-9•\-\*\.]+\s*", "", line).strip()
        if len(clean_line) < 4:
            continue

        weightage = 10
        weight_match = re.search(r"\((\d+)%\)", clean_line)
        if weight_match:
            weightage = int(weight_match.group(1))
            clean_line = re.sub(r"\(\d+%\)", "", clean_line).strip()

        # Infer competency tag based on keywords
        inferred_comp = "Statistical Governance"
        lower = clean_line.lower()
        if any(w in lower for w in ["sample", "sampling", "strata", "cluster"]):
            inferred_comp = "Statistical Sampling Methods"
        elif any(w in lower for w in ["quality", "validation", "clean", "audit"]):
            inferred_comp = "Data Quality Assurance"
        elif any(w in lower for w in ["analysis", "regression", "hypothesis", "interpret"]):
            inferred_comp = "Data Analysis & Interpretation"
        elif any(w in lower for w in ["python", "software", "computing", "tool"]):
            inferred_comp = "Statistical Software Proficiency"
        elif any(w in lower for w in ["report", "presentation", "write", "summary"]):
            inferred_comp = "Report Writing"
        elif any(w in lower for w in ["communication", "stakeholder", "briefing"]):
            inferred_comp = "Stakeholder Communication"

        items.append({
            "topic": clean_line,
            "competency": inferred_comp,
            "weightage": weightage,
            "section": current_section,
        })

    return items


def compare_syllabus_versions(
    v1_items: List[Dict[str, Any]],
    v2_items: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Calculates exact set differences between syllabus versions:
    ADDED, REMOVED, MODIFIED, UNCHANGED
    """
    v1_map = {item["topic"].lower(): item for item in v1_items}
    v2_map = {item["topic"].lower(): item for item in v2_items}

    added = []
    removed = []
    modified = []
    unchanged = []
    affected_competencies = set()

    for key, v2_item in v2_map.items():
        if key not in v1_map:
            added.append(v2_item["topic"])
            affected_competencies.add(v2_item["competency"])
        else:
            v1_item = v1_map[key]
            if v1_item["weightage"] != v2_item["weightage"] or v1_item["section"] != v2_item["section"]:
                modified.append(f"{v2_item['topic']} (weight: {v1_item['weightage']}% → {v2_item['weightage']}%)")
                affected_competencies.add(v2_item["competency"])
            else:
                unchanged.append(v2_item["topic"])

    for key, v1_item in v1_map.items():
        if key not in v2_map:
            removed.append(v1_item["topic"])
            affected_competencies.add(v1_item["competency"])

    return {
        "added_topics": added,
        "removed_topics": removed,
        "modified_topics": modified,
        "unchanged_topics": unchanged,
        "affected_competencies": sorted(list(affected_competencies)),
    }


def ingest_and_compare_syllabus(
    db: Session,
    v1_title: str,
    v1_text: str,
    v2_title: str,
    v2_text: str,
) -> Dict[str, Any]:
    """
    Saves both syllabus versions, computes diff, transitions affected questions
    in the question pool to 'REVIEW', and returns comparison summary.
    """
    v1_structure = parse_syllabus_text(v1_text)
    v2_structure = parse_syllabus_text(v2_text)

    diff = compare_syllabus_versions(v1_structure, v2_structure)

    # Save v1
    v1 = SyllabusVersion(
        title=v1_title,
        version="v1.0",
        raw_text=v1_text,
        parsed_structure=v1_structure,
        uploaded_at=datetime.utcnow(),
    )
    db.add(v1)

    # Save v2 with diff
    v2 = SyllabusVersion(
        title=v2_title,
        version="v2.0",
        raw_text=v2_text,
        parsed_structure=v2_structure,
        diff_summary=diff,
        uploaded_at=datetime.utcnow(),
    )
    db.add(v2)
    db.commit()

    # Flag existing active question versions targeting affected competencies as 'REVIEW'
    affected_count = 0
    if diff["affected_competencies"]:
        quizzes = db.query(Quiz).all()
        for q in quizzes:
            questions = q.questions or []
            for item in questions:
                q_comp = item.get("competency") or ""
                if any(aff.lower() in q_comp.lower() for aff in diff["affected_competencies"]):
                    # Record a question version in REVIEW status
                    q_id = item.get("question", "")[:32]
                    existing_ver = (
                        db.query(QuestionVersion)
                        .filter(QuestionVersion.question_id == q_id, QuestionVersion.status == "ACTIVE")
                        .first()
                    )
                    if existing_ver:
                        existing_ver.status = "REVIEW"
                        affected_count += 1
                    else:
                        q_ver = QuestionVersion(
                            question_id=q_id,
                            quiz_id=q.id,
                            version=1,
                            status="REVIEW",
                            question_data=item,
                            created_at=datetime.utcnow(),
                        )
                        db.add(q_ver)
                        affected_count += 1
        db.commit()

    return {
        "v1_title": v1_title,
        "v2_title": v2_title,
        "added_topics": diff["added_topics"],
        "removed_topics": diff["removed_topics"],
        "modified_topics": diff["modified_topics"],
        "unchanged_topics": diff["unchanged_topics"],
        "affected_competencies": diff["affected_competencies"],
        "affected_questions_count": affected_count,
    }
