"""
Prerequisite Knowledge Graph Generator Script.
Queries competency pairs under the same Position/Role in the FRAC hierarchy,
determines prerequisite directed relationships via the LLM provider chain (Gemini -> Groq -> fallback),
and persists edges with confidence >= 0.7 into the `competency_prereqs` table on Supabase PostgreSQL.
Idempotent and resumable.
"""
import os
import sys
import time
import json
import logging
from typing import List, Tuple

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import Competency, Activity, Role, Position, CompetencyPrereq
from app.services.llm import _call_llm, _extract_json

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PrereqGraphBuilder")

# Domain knowledge fallback matrix for statistical civil service cadre
DOMAIN_PREREQ_HEURISTICS = [
    # (A, B) -> A is prerequisite for B
    ("Field Data Collection Protocols", "Data Quality Assurance"),
    ("Field Data Collection Protocols", "Statistical Sampling Methods"),
    ("Data Quality Assurance", "Data Analysis & Interpretation"),
    ("Statistical Software Proficiency", "Data Analysis & Interpretation"),
    ("Statistical Sampling Methods", "Data Analysis & Interpretation"),
    ("Data Analysis & Interpretation", "Report Writing"),
    ("Report Writing", "Policy Communication"),
    ("Attention to Detail", "Data Quality Assurance"),
    ("Stakeholder Communication", "Policy Communication"),
]


def check_prereq_llm(comp_a: Competency, comp_b: Competency) -> Tuple[bool, float]:
    """
    Asks LLM provider chain if mastering comp_a is a prerequisite for mastering comp_b.
    Returns (is_prereq, confidence).
    """
    prompt = f"""You are a curriculum and competency graph specialist under India's Mission Karmayogi National Programme for Civil Services Capacity Building (FRAC).

Analyze the learning and execution dependency between these two civil service competencies:

Competency A:
- Name: {comp_a.name}
- Level: {comp_a.required_level}/5
- Description: {comp_a.description or 'No description provided'}

Competency B:
- Name: {comp_b.name}
- Level: {comp_b.required_level}/5
- Description: {comp_b.description or 'No description provided'}

Question: Does mastering Competency A logically and educationally precede mastering Competency B (is A a foundational prerequisite for B)?
Criteria:
- Return is_prereq: true ONLY if a professional must understand/master A before being able to master B.
- If they are parallel skills or independent, return is_prereq: false.
- Confidence must be a float between 0.0 and 1.0.

Reply ONLY with valid JSON in this exact structure:
{{
  "is_prereq": true,
  "confidence": 0.85
}}
"""
    try:
        raw = _call_llm(prompt)
        data = _extract_json(raw)
        if isinstance(data, dict) and "is_prereq" in data:
            is_prereq = bool(data["is_prereq"])
            conf = float(data.get("confidence", 0.75))
            return is_prereq, conf
    except Exception as e:
        logger.warning(f"LLM prereq check failed for '{comp_a.name}' -> '{comp_b.name}' ({e}). Using domain heuristics.")

    # Domain heuristic fallback
    for p_a, p_b in DOMAIN_PREREQ_HEURISTICS:
        if p_a.lower() in comp_a.name.lower() and p_b.lower() in comp_b.name.lower():
            return True, 0.90

    return False, 0.0


def build_prerequisite_graph():
    db: Session = SessionLocal()
    try:
        total_edges_created = 0

        # Step 1: Ensure canonical domain dependencies are present
        all_comps = {c.name.lower(): c for c in db.query(Competency).all()}
        existing_edges = set(
            (e.competency_id, e.prereq_competency_id)
            for e in db.query(CompetencyPrereq).all()
        )

        logger.info("Seeding canonical civil service prerequisite dependencies...")
        for p_a_name, p_b_name in DOMAIN_PREREQ_HEURISTICS:
            comp_a = next((c for name, c in all_comps.items() if p_a_name.lower() in name), None)
            comp_b = next((c for name, c in all_comps.items() if p_b_name.lower() in name), None)
            if comp_a and comp_b:
                edge_key = (comp_b.id, comp_a.id)
                if edge_key not in existing_edges:
                    logger.info(f"  [SEED CANONICAL] '{comp_a.name}' (L{comp_a.required_level}) -> '{comp_b.name}' (L{comp_b.required_level})")
                    db.add(CompetencyPrereq(
                        competency_id=comp_b.id,
                        prereq_competency_id=comp_a.id,
                        confidence=0.92,
                    ))
                    db.commit()
                    existing_edges.add(edge_key)
                    total_edges_created += 1

        positions = db.query(Position).all()
        logger.info(f"Found {len(positions)} positions in database.")

        # Step 2: Test LLM for remaining candidate pairs under each position/role
        for pos in positions:
            logger.info(f"Processing Position: {pos.title} (ID: {pos.id})")

            # Collect all competencies under this position
            comps = (
                db.query(Competency)
                .join(Activity, Competency.activity_id == Activity.id)
                .join(Role, Activity.role_id == Role.id)
                .filter(Role.position_id == pos.id)
                .all()
            )

            unique_comps = list({c.id: c for c in comps}.values())
            logger.info(f"  Found {len(unique_comps)} competencies under position '{pos.title}'.")

            # Test candidate pairs where prereq level <= target level (logical prerequisite condition)
            for i in range(len(unique_comps)):
                for j in range(len(unique_comps)):
                    if i == j:
                        continue

                    comp_prereq = unique_comps[i]  # Potential prerequisite (A)
                    comp_target = unique_comps[j]  # Potential target (B)

                    # Only test if prereq level <= target level
                    if comp_prereq.required_level > comp_target.required_level:
                        continue

                    # Edge: comp_target depends on comp_prereq
                    edge_key = (comp_target.id, comp_prereq.id)
                    if edge_key in existing_edges:
                        continue

                    time.sleep(0.3)
                    is_prereq, confidence = check_prereq_llm(comp_prereq, comp_target)

                    if is_prereq and confidence >= 0.70:
                        logger.info(
                            f"  [EDGE CONFIRMED] '{comp_prereq.name}' -> '{comp_target.name}' (Confidence: {confidence:.2f})"
                        )
                        new_edge = CompetencyPrereq(
                            competency_id=comp_target.id,
                            prereq_competency_id=comp_prereq.id,
                            confidence=round(confidence, 2),
                        )
                        db.add(new_edge)
                        db.commit()
                        existing_edges.add(edge_key)
                        total_edges_created += 1

        logger.info(f"Prerequisite graph build completed! Total new edges created: {total_edges_created}")

        # Summary of all edges in DB
        total_in_db = db.query(CompetencyPrereq).count()
        logger.info(f"Total prerequisite edges in competency_prereqs table: {total_in_db}")

    finally:
        db.close()


if __name__ == "__main__":
    build_prerequisite_graph()
