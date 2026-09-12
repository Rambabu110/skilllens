from typing import Optional, Tuple, Set
from sqlalchemy.orm import Session

from app.models.models import (
    Learner, Competency, LearnerCompetencyScore, Activity, Role, CompetencyPrereq,
)
from app.ml.inference import predict_competency_level, heuristic_from_profile


def get_required_competencies_for_learner(db: Session, learner: Learner) -> list[Competency]:
    """Walk the FRAC chain: Position -> Role -> Activity -> Competency."""
    if not learner.position_id:
        return []
    roles = db.query(Role).filter(Role.position_id == learner.position_id).all()
    role_ids = [r.id for r in roles]
    activities = db.query(Activity).filter(Activity.role_id.in_(role_ids)).all()
    activity_ids = [a.id for a in activities]
    competencies = db.query(Competency).filter(Competency.activity_id.in_(activity_ids)).all()
    return competencies


def ensure_competency_scores(db: Session, learner: Learner) -> list[LearnerCompetencyScore]:
    """
    Ensures every FRAC-required competency for this learner has a score row.
    """
    required = get_required_competencies_for_learner(db, learner)
    existing = {s.competency_id: s for s in learner.scores}

    if learner.behavioral_features:
        level, confidence = predict_competency_level(learner.behavioral_features)
    else:
        level, confidence = heuristic_from_profile(learner.experience_years, learner.qualification)

    for comp in required:
        if comp.id in existing:
            continue
        score = LearnerCompetencyScore(
            learner_id=learner.id, competency_id=comp.id,
            current_level=level, confidence=confidence,
            mastery_probability=0.3,
        )
        db.add(score)
    db.commit()
    db.refresh(learner)
    return learner.scores


def find_root_gap(
    comp_id: str,
    gap_map: dict,
    prereq_map: dict,
    name_map: dict,
    visited: Optional[Set[str]] = None,
) -> Tuple[Optional[str], int]:
    """
    Recursively walks up the prerequisite knowledge graph.
    If a prerequisite competency also has gap >= 0.5 for that learner, keep walking up.
    The topmost ancestor is the ROOT GAP.
    Returns (root_gap_competency_name, depth).
    """
    if visited is None:
        visited = set()

    if comp_id in visited:
        return None, 0
    visited.add(comp_id)

    prereqs = prereq_map.get(comp_id, [])
    gap_prereqs = [p for p in prereqs if gap_map.get(p, 0.0) >= 0.5 and p not in visited]

    if not gap_prereqs:
        return None, 0

    best_root = None
    max_depth = 0

    for p in gap_prereqs:
        ancestor_root, ancestor_depth = find_root_gap(p, gap_map, prereq_map, name_map, visited.copy())
        current_root = ancestor_root if ancestor_root else name_map.get(p, "Prerequisite Competency")
        total_depth = ancestor_depth + 1
        if total_depth > max_depth:
            max_depth = total_depth
            best_root = current_root

    return best_root, max_depth


def compute_gaps(db: Session, learner: Learner) -> list[dict]:
    scores = ensure_competency_scores(db, learner)
    required = {c.id: c for c in get_required_competencies_for_learner(db, learner)}

    gaps = []
    for score in scores:
        comp = required.get(score.competency_id)
        if not comp:
            continue
        gap_size = comp.required_level - score.current_level
        if gap_size >= 2:
            status = "critical"
        elif gap_size >= 0.5:
            status = "developing"
        else:
            status = "strength"

        mastery_prob = getattr(score, "mastery_probability", 0.3)
        if mastery_prob is None:
            mastery_prob = 0.3

        gap_type = "Deep Gap" if (mastery_prob < 0.5 and gap_size >= 2.0) else "Shallow Gap"

        gaps.append({
            "competency_id": comp.id,
            "competency_name": comp.name,
            "competency_type": comp.type.value if hasattr(comp.type, "value") else comp.type,
            "required_level": comp.required_level,
            "current_level": score.current_level,
            "gap_size": round(gap_size, 2),
            "status": status,
            "mastery_probability": round(float(mastery_prob), 4),
            "gap_type": gap_type,
        })

    # Root-cause analysis via prerequisite graph traversal
    gap_map = {g["competency_id"]: g["gap_size"] for g in gaps}
    name_map = {g["competency_id"]: g["competency_name"] for g in gaps}

    # Query prerequisite edges
    prereqs = db.query(CompetencyPrereq).all()
    prereq_map = {}
    for p in prereqs:
        prereq_map.setdefault(p.competency_id, []).append(p.prereq_competency_id)

    for g in gaps:
        if g["gap_size"] >= 0.5:
            root_name, depth = find_root_gap(g["competency_id"], gap_map, prereq_map, name_map)
            g["root_gap_competency"] = root_name
            g["depth"] = depth
        else:
            g["root_gap_competency"] = None
            g["depth"] = 0

    gaps.sort(key=lambda g: -g["gap_size"])
    return gaps


def get_prereq_subgraph(db: Session, learner: Learner) -> dict:
    """
    Extracts the prerequisite DAG for the learner's competencies and gaps,
    ready for SVG rendering in the frontend.
    """
    gaps = compute_gaps(db, learner)
    gap_ids = {g["competency_id"] for g in gaps}

    edges = db.query(CompetencyPrereq).filter(
        CompetencyPrereq.competency_id.in_(gap_ids),
        CompetencyPrereq.prereq_competency_id.in_(gap_ids)
    ).all()

    nodes = []
    for g in gaps:
        is_root = bool(g.get("depth", 0) == 0 and g["gap_size"] >= 0.5)
        nodes.append({
            "id": g["competency_id"],
            "name": g["competency_name"],
            "required_level": g["required_level"],
            "current_level": g["current_level"],
            "gap_size": g["gap_size"],
            "status": g["status"],
            "gap_type": g["gap_type"],
            "depth": g.get("depth", 0),
            "root_gap_competency": g.get("root_gap_competency"),
            "is_root": is_root,
        })

    edge_list = [
        {
            "from": e.prereq_competency_id,
            "to": e.competency_id,
            "confidence": e.confidence
        }
        for e in edges
    ]

    return {"nodes": nodes, "edges": edge_list}


def apply_quiz_result_to_competencies(db: Session, learner: Learner, competency_ids: list[str], score_pct: float):
    """
    Continuous Competency Intelligence (PRD 5.5): a quiz result nudges the
    learner's current_level for the competencies it targeted. Simple,
    transparent update rule -- deliberately not a black box, so it can be
    explained to judges in one sentence: 'a strong quiz result on a
    competency raises its score toward the quiz's implied level; a weak
    result pulls it down.'
    """
    from app.services.knowledge_tracing import update_mastery

    implied_level = (score_pct / 100.0) * 5.0
    is_correct = bool(score_pct >= 60.0)

    for comp_id in competency_ids:
        row = (
            db.query(LearnerCompetencyScore)
            .filter(LearnerCompetencyScore.learner_id == learner.id,
                     LearnerCompetencyScore.competency_id == comp_id)
            .first()
        )
        if not row:
            row = LearnerCompetencyScore(
                learner_id=learner.id,
                competency_id=comp_id,
                current_level=round(implied_level, 2),
                confidence=0.45,
                mastery_probability=update_mastery(0.3, is_correct),
            )
            db.add(row)
            continue
        # Exponential moving average: 60% old, 40% new evidence.
        row.current_level = round(0.6 * row.current_level + 0.4 * implied_level, 2)
        row.confidence = min(1.0, (row.confidence or 0.4) + 0.05)

        # Bayesian Knowledge Tracing: update mastery probability in parallel
        prev_mastery = getattr(row, "mastery_probability", 0.3)
        row.mastery_probability = update_mastery(prev_mastery, is_correct)

    db.commit()
