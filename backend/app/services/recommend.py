"""
SkillLens AI — Hybrid Recommender Engine (PRD Part 12)

Implements the multi-factor weighted scoring model:
FINAL SCORE =
  0.35 * competency_gap_relevance
+ 0.20 * prerequisite_priority
+ 0.15 * content_similarity
+ 0.10 * difficulty_fit
+ 0.10 * learner_history
+ 0.10 * mastery_improvement_potential

Centrally configured weights with explainable, itemized rationales.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.models import LearningModule, ModuleCompetency, Competency, QuizAttempt
from app.services.dag_service import get_validated_prereq_graph

# Centrally stored weights (PRD Part 12)
RECOMMENDER_WEIGHTS = {
    "gap_relevance": 0.35,
    "prereq_priority": 0.20,
    "content_similarity": 0.15,
    "difficulty_fit": 0.10,
    "learner_history": 0.10,
    "mastery_improvement_potential": 0.10,
}


def recommend_for_gaps(
    db: Session,
    gaps: List[Dict[str, Any]],
    learner_id: Optional[str] = None,
    top_n: int = 6,
) -> List[Dict[str, Any]]:
    """
    Ranks learning modules using the 6-factor hybrid formula:
    Returns list of dicts with:
      module: LearningModule
      matched_competency_id: str
      match_type: str
      score: float (0.0 to 1.0+)
      rationale: str (itemized bullet points)
    """
    critical_and_developing = [g for g in gaps if g.get("status") != "strength"]
    if not critical_and_developing:
        # Continuing Professional Development (CPD) & Enrichment mode
        critical_and_developing = gaps if gaps else []
    if not critical_and_developing:
        return []


    gap_dict = {g["competency_id"]: g for g in critical_and_developing}
    max_gap = max(g["gap_size"] for g in critical_and_developing) if critical_and_developing else 1.0
    prereq_map = get_validated_prereq_graph(db)

    # Learner past attempts for history factor
    attempted_module_ids = set()
    if learner_id:
        attempts = db.query(QuizAttempt).filter(QuizAttempt.learner_id == learner_id).all()
        # collect attempted modules if quiz had module_id
        for att in attempts:
            if hasattr(att, "quiz") and att.quiz and att.quiz.module_id:
                attempted_module_ids.add(att.quiz.module_id)

    # Load modules and links
    all_modules = db.query(LearningModule).all()
    all_links = db.query(ModuleCompetency).all()

    module_to_comps = {}
    for link in all_links:
        module_to_comps.setdefault(link.module_id, []).append(link.competency_id)

    # TF-IDF similarity preparation
    mod_texts = [f"{m.title} {m.description or ''}" for m in all_modules]
    gap_texts = [f"{g['competency_name']} {g.get('competency_type', '')}" for g in critical_and_developing]

    tfidf_sim_matrix = None
    if mod_texts and gap_texts:
        try:
            vectorizer = TfidfVectorizer(stop_words="english")
            corpus = mod_texts + gap_texts
            tfidf = vectorizer.fit_transform(corpus)
            mod_vecs = tfidf[:len(mod_texts)]
            gap_vecs = tfidf[len(mod_texts):]
            tfidf_sim_matrix = cosine_similarity(gap_vecs, mod_vecs)
        except Exception:
            pass

    scored_candidates = []

    for m_idx, module in enumerate(all_modules):
        m_comps = module_to_comps.get(module.id, [])

        # Find best matching gap among this module's linked competencies
        best_gap = None
        matched_comp_id = None
        for c_id in m_comps:
            if c_id in gap_dict:
                best_gap = gap_dict[c_id]
                matched_comp_id = c_id
                break

        # If no exact rule link, find best TF-IDF similarity match
        sim_score = 0.0
        if tfidf_sim_matrix is not None and tfidf_sim_matrix.shape[0] > 0:
            best_sim_idx = tfidf_sim_matrix[:, m_idx].argmax()
            sim_score = float(tfidf_sim_matrix[best_sim_idx, m_idx])
            if not best_gap:
                best_gap = critical_and_developing[best_sim_idx]
                matched_comp_id = best_gap["competency_id"]

        if not best_gap:
            continue

        # 1. Competency Gap Relevance (0.0 to 1.0)
        gap_relevance = min(1.0, max(0.0, best_gap["gap_size"] / max(max_gap, 1.0)))

        # 2. Prerequisite Priority (0.0 or 1.0)
        # Higher if this module addresses a root gap or upstream prerequisite
        is_prereq_root = bool(best_gap.get("depth", 0) > 0 or best_gap.get("root_gap_competency"))
        prereq_priority = 1.0 if is_prereq_root else 0.4

        # 3. Content Similarity (0.0 to 1.0)
        content_sim = min(1.0, max(0.0, sim_score if sim_score > 0 else (1.0 if matched_comp_id in m_comps else 0.3)))

        # 4. Difficulty Fit (0.0 to 1.0)
        # How well module.level matches learner's current competency level
        curr_lvl = best_gap.get("current_level", 2.0)
        diff_distance = abs(module.level - curr_lvl)
        difficulty_fit = max(0.2, 1.0 - (diff_distance * 0.25))

        # 5. Learner History (0.0 to 1.0)
        # Favor uncompleted modules; penalize repeated modules
        learner_history = 0.3 if module.id in attempted_module_ids else 1.0

        # 6. Mastery Improvement Potential (0.0 to 1.0)
        # Lower current BKT mastery = higher growth headroom
        bkt_mastery = best_gap.get("mastery_probability", 0.3)
        improvement_potential = max(0.1, 1.0 - bkt_mastery)

        # Compute weighted final score
        final_score = (
            RECOMMENDER_WEIGHTS["gap_relevance"] * gap_relevance
            + RECOMMENDER_WEIGHTS["prereq_priority"] * prereq_priority
            + RECOMMENDER_WEIGHTS["content_similarity"] * content_sim
            + RECOMMENDER_WEIGHTS["difficulty_fit"] * difficulty_fit
            + RECOMMENDER_WEIGHTS["learner_history"] * learner_history
            + RECOMMENDER_WEIGHTS["mastery_improvement_potential"] * improvement_potential
        )

        # Build structured, explainable rationale (PRD Part 12)
        reasons = []
        if gap_relevance >= 0.7:
            reasons.append(f"Directly addresses your critical deficit in {best_gap['competency_name']} (gap: {best_gap['gap_size']})")
        else:
            reasons.append(f"Strengthens developing competency in {best_gap['competency_name']}")

        if is_prereq_root:
            reasons.append(f"Satisfies upstream prerequisite for '{best_gap.get('root_gap_competency', 'advanced skills')}'")
        if difficulty_fit >= 0.7:
            reasons.append(f"Optimal difficulty fit for your current proficiency level ({curr_lvl:.1f}/5.0)")
        if module.id not in attempted_module_ids:
            reasons.append("New module not previously attempted")
        else:
            reasons.append("Revision unit to reinforce previously attempted concepts")

        rationale_text = "Recommended because:\n• " + "\n• ".join(reasons)

        scored_candidates.append({
            "module": module,
            "matched_competency_id": matched_comp_id,
            "match_type": "hybrid_weighted_rule" if matched_comp_id in m_comps else "hybrid_similarity",
            "score": round(final_score, 3),
            "rationale": rationale_text,
            "gap_relevance": round(gap_relevance, 2),
            "prereq_priority": round(prereq_priority, 2),
            "difficulty_fit": round(difficulty_fit, 2),
        })

    # Sort by final score descending
    scored_candidates.sort(key=lambda x: -x["score"])
    return scored_candidates[:top_n]
