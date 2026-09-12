from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.models import LearningModule, ModuleCompetency, Competency


def recommend_for_gaps(db: Session, gaps: list[dict], top_n: int = 5) -> list[dict]:
    """
    Hybrid recommender (PRD 5.3):
      1. Root-cause prioritization: gaps with root_gap_competency prioritize
         modules targeting the ROOT competency first (ordered by depth descending),
         with rationale: "Fix the root: {root_name} → then this."
      2. Rule layer: exact competency_id -> module links (ModuleCompetency)
      3. Similarity layer: TF-IDF cosine similarity between the gap's
         competency name/description and module descriptions, for gaps
         with no direct rule match.
    Critical gaps are prioritized first.
    """
    critical_and_developing = [g for g in gaps if g["status"] != "strength"]
    if not critical_and_developing:
        return []

    recommendations = []
    seen_module_ids = set()

    # --- Root-cause priority layer ---
    # Find gaps that have a root_gap_competency and depth > 0, ordered by depth descending
    root_gaps = [g for g in critical_and_developing if g.get("root_gap_competency") and g.get("depth", 0) > 0]
    root_gaps.sort(key=lambda g: -g.get("depth", 0))

    for gap in root_gaps:
        root_name = gap["root_gap_competency"]
        root_comp = db.query(Competency).filter(Competency.name.ilike(f"%{root_name}%")).first()
        if not root_comp:
            continue

        root_links = (
            db.query(ModuleCompetency)
            .filter(ModuleCompetency.competency_id == root_comp.id)
            .all()
        )
        for link in root_links:
            if link.module_id in seen_module_ids:
                continue
            module = db.query(LearningModule).get(link.module_id)
            if not module:
                continue
            recommendations.append({
                "module": module,
                "matched_competency_id": root_comp.id,
                "match_type": "root_cause_rule",
                "score": 1.2,
                "rationale": f"Fix the root: {root_name} → then this.",
            })
            seen_module_ids.add(module.id)

    # --- Standard Rule layer ---
    for gap in critical_and_developing:
        links = (
            db.query(ModuleCompetency)
            .filter(ModuleCompetency.competency_id == gap["competency_id"])
            .all()
        )
        for link in links:
            if link.module_id in seen_module_ids:
                continue
            module = db.query(LearningModule).get(link.module_id)
            if not module:
                continue
            rationale = (
                f"Fix the root: {gap['root_gap_competency']} → then this."
                if gap.get("root_gap_competency")
                else f"Direct training for {gap['competency_name']}."
            )
            recommendations.append({
                "module": module,
                "matched_competency_id": gap["competency_id"],
                "match_type": "rule",
                "score": 1.0,
                "rationale": rationale,
            })
            seen_module_ids.add(module.id)

    if len(recommendations) >= top_n:
        return recommendations[:top_n]

    # --- Similarity layer (fills remaining slots) ---
    all_modules = db.query(LearningModule).filter(~LearningModule.id.in_(seen_module_ids)).all()
    if not all_modules:
        return recommendations[:top_n]

    module_texts = [f"{m.title} {m.description or ''}" for m in all_modules]
    gap_texts = [f"{g['competency_name']} {g['competency_type']}" for g in critical_and_developing]

    corpus = module_texts + gap_texts
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf = vectorizer.fit_transform(corpus)

    module_vectors = tfidf[: len(module_texts)]
    gap_vectors = tfidf[len(module_texts):]

    sims = cosine_similarity(gap_vectors, module_vectors)

    for gi, gap in enumerate(critical_and_developing):
        if len(recommendations) >= top_n:
            break
        best_idx = sims[gi].argmax()
        best_score = float(sims[gi][best_idx])
        module = all_modules[best_idx]
        if module.id in seen_module_ids or best_score <= 0:
            continue
        recommendations.append({
            "module": module,
            "matched_competency_id": gap["competency_id"],
            "match_type": "similarity",
            "score": round(best_score, 3),
            "rationale": (
                f"Fix the root: {gap['root_gap_competency']} → then this."
                if gap.get("root_gap_competency")
                else None
            ),
        })
        seen_module_ids.add(module.id)

    return recommendations[:top_n]
