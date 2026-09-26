# SkillLens AI — Pitch Deck Replacement Text

**Project**: SkillLens AI (SIH26101)  
**Team**: Zero Day Nextron  
**Theme**: Mission Karmayogi Civil Services Capacity Building

---

## Slide 1: Title Slide
- **Headline**: SkillLens AI: Closing the Competency Evidence Loop in Mission Karmayogi
- **Subheadline**: Continuous Competency Intelligence, True RAG Knowledge Retrieval & Prerequisite Gap Diagnostics for Civil Service Cadres
- **Footer**: Team Zero Day Nextron · SIH 2026

---

## Slide 2: The Problem: The Broken Competency Loop
- **Headline**: What Should I Learn? vs. Can I Actually Demonstrate It?
- **Bullet Points**:
  - **iGOT Karmayogi's Success**: Over 10,000 online courses provide widespread training access across Indian ministries.
  - **The Missing Link**: Course completion alone does not measure on-the-job competency development or job-readiness.
  - **Cadre Deficit Invisibility**: Training administrators have no empirical data to trace whether an officer's deficit is an isolated flaw or an upstream prerequisite root cause.
  - **The Solution**: An objective, continuous competency diagnostic engine that tests against authentic operational manuals.

---

## Slide 3: The Architecture: The Evidence Loop
- **Headline**: How SkillLens Complements iGOT Karmayogi
- **Workflow**:
  1. **FRAC Cadre Profiling**: Standard competency baselines mapped to specific government positions (e.g. Junior Statistical Officer).
  2. **True RAG Retrieval**: Assessments generated strictly from authorized departmental circulars and manuals with verbatim citations.
  3. **Bayesian Knowledge Tracing (BKT)**: Fine-grained, topic-level mastery tracking based on probabilistic learning evidence.
  4. **Prerequisite Knowledge DAG**: Directed Acyclic Graph tracing foundational root causes.
  5. **6-Factor Hybrid Recommender**: Personalized training pathways aligned with FRAC gaps.
  6. **Reassessment & Verifiable Passbook**: Before/after delta verification and tamper-evident certificate issuance.

---

## Slide 4: Innovation 1 — True RAG Pipeline with Zero Hallucination
- **Headline**: Grounded Assessment Generation with Verifiable Citations
- **Key Technical Highlights**:
  - **Deterministic Chunking**: 800-1200 token sliding windows with SHA-256 integrity hashes.
  - **Dense Vector Embeddings**: 384-dimensional dense semantic vectors stored locally in compressed `.npz` indices.
  - **Top-K Cosine Retrieval**: High-precision similarity matching against operational queries.
  - **Negative Constraint Guardrail**: Strict LLM instruction returning `INSUFFICIENT_EVIDENCE` if facts are missing.
  - **Verbatim Citations**: Every multiple-choice question displays document name, page number, and source excerpt.

---

## Slide 5: Innovation 2 — Prerequisite Knowledge Graph & Root Cause Tracing
- **Headline**: Moving Beyond Symptoms: Diagnosing Foundational Deficits
- **Key Technical Highlights**:
  - **Cycle-Validated DAG**: Validated with Kahn's topological sorting algorithm ($V+E$ linear time complexity).
  - **Deepest Ancestor Traversal**: Recursive graph traversal (`find_root_gap`) identifies the deepest upstream prerequisite with a deficit.
  - **Cadre Heatmap**: Aggregates cohort-level deficits to inform institutional Training Needs Analysis (TNA).

---

## Slide 6: Innovation 3 — 6-Factor Hybrid Recommender Engine
- **Headline**: Multi-Factor Optimization with Explainable Itemized Rationales
- **Scoring Formula**:
  $$\text{Final Score} = 0.35 \cdot \text{Gap} + 0.20 \cdot \text{Prereq} + 0.15 \cdot \text{Similarity} + 0.10 \cdot \text{Difficulty} + 0.10 \cdot \text{History} + 0.10 \cdot \text{Mastery}$$
- **Key Strengths**:
  - **Explainability**: Every recommendation displays why it was prioritized.
  - **Continuing Professional Development (CPD)**: Graceful fallback to enrichment modules when all critical gaps are closed.

---

## Slide 7: Innovation 4 — Syllabus Pattern Watcher & Item Bank Governance
- **Headline**: Adaptive Curriculum Tracking for Dynamic Administrative Guidelines
- **Key Technical Highlights**:
  - **Differential Set Analysis**: Automatically categorizes syllabus revisions into ADDED, REMOVED, MODIFIED, and UNCHANGED topics.
  - **Question Bank Lifecycle**: Flags active questions associated with updated topics to `REVIEW` status, preventing outdated assessment items from reaching learners.

---

## Slide 8: Verifiable Credentials & PDF Passbook
- **Headline**: Cryptographic Tamper-Evidence for Civil Service Portfolios
- **Key Technical Highlights**:
  - **Standardized Certificate ID**: Unique alphanumeric code format (e.g. `SL-2026-CERT-XXXX`).
  - **Public Verification Gateway**: Anyone can verify recipient name, cadre, competency domain, and issue date at `/verify/certificate/:id`.
  - **PDF Export**: ReportLab-generated official Competency Passbook containing full audit history and radar charts.

---

## Slide 9: Enterprise Security & Governance
- **Headline**: Zero-Trust Principles for Public Sector Digital Infrastructure
- **Key Technical Highlights**:
  - **Role-Based Access Control**: Strict separation between Cadre Learners and Training Administrators.
  - **Sanitized Audit Trail**: Sensitive parameters, passwords, and tokens are redacted before persisting in `AuditEvent`.
  - **Timing-Safe Authentication**: Constant-time comparison prevents side-channel timing attacks.

---

## Slide 10: Conclusion & National Impact
- **Headline**: Empirical Competency Verification for India's 21st-Century Civil Service
- **Impact Summary**:
  - Eliminates subjective performance guesswork with empirical competency evidence.
  - Seamlessly complements iGOT Karmayogi by providing the missing diagnostic evaluation layer.
  - 100% automated test coverage, production-ready architecture, and ethical prototype honesty.
