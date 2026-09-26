# SkillLens AI — System Architecture Document

**Team**: Zero Day Nextron  
**Project**: SkillLens AI (SIH26101)  
**Target Ministry**: Ministry of Statistics and Programme Implementation (MoSPI) / Mission Karmayogi Ecosystem  
**Version**: 2.4 (Prototype Final)

---

## 1. Executive Summary

SkillLens AI is an AI-powered Continuous Competency Diagnostic and Adaptive Learning Platform designed to close the critical **Competency Evidence Loop** within India's Civil Services capacity building framework (Mission Karmayogi).

While platforms like iGOT Karmayogi provide an extensive catalog of learning courses (*"What should civil servants learn?"*), government institutions currently lack a rigorous, deterministic method to verify whether an officer has actually developed competency through on-the-job application (*"Can the officer demonstrate this competency under authentic conditions?"*). SkillLens bridges this gap through:

1. **FRAC Hierarchy Mapping**: Standard positions, roles, activities, and behavioral/domain/functional competencies.
2. **True RAG Pipeline**: Local deterministic dense embedding retrieval directly from official manuals and circulars with verbatim source citations.
3. **Continuous Competency Evidence Engine**: Granular topic-level Bayesian Knowledge Tracing (BKT) that continuously updates mastery states without black-box opacity.
4. **Prerequisite Knowledge DAG**: Cycle-validated Directed Acyclic Graph tracing upstream root cause deficits.
5. **6-Factor Hybrid Recommender**: Multi-factor ranking with explainable itemized rationales and continuing professional development fallbacks.
6. **Verifiable Passbook & Certificates**: Cryptographically tamper-evident credential verification with QR and unique alphanumeric hash codes.

---

## 2. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                             CLIENT TIER (React + Vite)                         |
|  - Modern Executive Dashboard (Glassmorphism / Tailwind / Lucide Icons)       |
|  - Interactive Competency Radar & Prerequisite Knowledge DAG                  |
|  - Source-Grounded Quiz Engine with Document Viewer & Verbatim Citations       |
|  - Dynamic Step-Locked Learning Pathway                                       |
|  - Administrative Dossier, Cadre Heatmap & Audit Log Console                   |
|  - Public Certificate Verification Gateway (/verify/certificate/:id)          |
+---------------------------------------+---------------------------------------+
                                        |  REST API (JSON / Bearer JWT)
+---------------------------------------v---------------------------------------+
|                       APPLICATION TIER (FastAPI / Python 3.14)                |
|                                                                               |
|  +------------------------+  +------------------------+  +------------------+ |
|  |     Security & Auth    |  |     FRAC Diagnostics   |  |   Recommender    | |
|  |  - JWT Bearer Tokens   |  |  - Gap Identification  |  |  - 6-Factor      | |
|  |  - Firebase Token Sync |  |  - Prerequisite DAG    |  |    Hybrid Model  | |
|  |  - RBAC (Admin / User) |  |  - Kahn's Algorithm    |  |  - Explainable   | |
|  |  - Audit Logging       |  |  - Root-Cause Tracer   |  |    Rationales    | |
|  +------------------------+  +------------------------+  +------------------+ |
|                                                                               |
|  +------------------------+  +------------------------+  +------------------+ |
|  |     True RAG Service   |  |     Knowledge Tracing  |  |  Passbook & Cert | |
|  |  - 800-1200 Token Chunks| |  - Bayesian Knowledge  |  |  - ReportLab PDF | |
|  |  - SHA-256 Chunk Hash  |  |    Tracing (BKT)       |  |  - SL-2026-CERT  | |
|  |  - 384-Dim Dense Index |  |  - Topic-Level Mastery |  |  - SHA-256 Hash  | |
|  |  - Top-K Cosine Sim    |  |  - Before/After Deltas |  |    Verification  | |
|  +------------------------+  +------------------------+  +------------------+ |
|                                                                               |
|  +------------------------+  +------------------------+  +------------------+ |
|  |  Syllabus Pattern Watch|  |   Gamification Engine  |  |  iGOT Provider   | |
|  |  - Set Diff Analysis   |  |  - Idempotent Points   |  |  - Abstract Base | |
|  |  - Question Pool Flags |  |  - Milestone Badges    |  |  - Mock Provider | |
|  |  - Active/Review/Arch  |  |  - In-App Alerts       |  |  - Provenance Lbl| |
|  +------------------------+  +------------------------+  +------------------+ |
+---------------------------------------+---------------------------------------+
                                        |
+---------------------------------------v---------------------------------------+
|                             PERSISTENCE & STORAGE                             |
|  - Relational Database: PostgreSQL (Supabase) with Resilient SQLite Fallback   |
|  - Dense Vector Store: Compressed NumPy (.npz) 384-dim semantic index matrices |
|  - Mock Catalog Data: Structured JSON for authenticated iGOT simulation       |
|  - Generated Artifacts: Real PDF passbooks & SVG prerequisite subgraphs       |
+-------------------------------------------------------------------------------+
```

---

## 3. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | React 19 + Vite 8 | Ultra-fast HMR, lean bundle size, modular component tree. |
| **Styling & Design** | Vanilla CSS + Tailwind CSS utilities | High-aesthetic dark mode, sovereign glassmorphism, institutional palette. |
| **Icons & Motion** | Lucide React | Clean, standard visual cues for accessible administrative UI. |
| **Backend Framework** | FastAPI (Python 3.14) | High throughput, automatic OpenAPI documentation, asynchronous concurrency. |
| **Database ORM** | SQLAlchemy 2.0 | Declarative models, relationship hydration, type safety. |
| **Primary Database** | PostgreSQL (Supabase) | Production relational storage with foreign key constraints and ACID guarantees. |
| **Fallback Database** | SQLite (`skilllens.db`) | Zero-configuration local execution resilience during internet/VPN disconnects. |
| **Text Embedding** | SentenceTransformers (`all-MiniLM-L6-v2`) / 384-dim Dense Hash Projection | Fast, deterministic semantic embedding vectors without paid third-party API dependencies. |
| **LLM Inference** | Groq API (`llama-3.3-70b-versatile`) with local template fallback | High-speed, cost-effective reasoning for question generation and explanation. |
| **Document Processing**| PyPDF2, python-docx, ReportLab | Native PDF/DOCX parsing and verifiable PDF certificate/passbook synthesis. |
| **Testing Engine** | Pytest + Starlette TestClient | 100% automated regression and end-to-end acceptance validation. |

---

## 4. Directory Structure

```
d:\SIH26101\
├── .agents/                        # Workspace rules & Graphify AI skills
├── graphify/                       # Cloned AST knowledge graph repository
├── skilllens/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── core/               # Database config, security, auth deps, settings
│   │   │   ├── models/             # SQLAlchemy ORM schemas
│   │   │   ├── schemas/            # Pydantic validation & response contracts
│   │   │   ├── routers/            # FastAPI API route controllers
│   │   │   │   ├── auth.py         # Login, register, Firebase token sync
│   │   │   │   ├── admin.py        # Dossier, audits, syllabus watcher, question bank
│   │   │   │   ├── competency.py   # FRAC profile, radar metrics, topics
│   │   │   │   ├── gaps.py         # Gap computation, prerequisite graph
│   │   │   │   ├── learning_path.py# Step-locked dynamic pathways
│   │   │   │   ├── quiz.py         # RAG upload, generate, submit, reassess
│   │   │   │   ├── certificate.py  # Public certificate issuance & verification
│   │   │   │   ├── gamification.py # Points, badges, leaderboard
│   │   │   │   ├── notifications.py# In-app event alerts
│   │   │   │   ├── mock_igot.py    # Honest iGOT prototype catalog API
│   │   │   │   └── export.py       # Passbook PDF export
│   │   │   └── services/           # Business logic services
│   │   │       ├── rag_service.py              # True RAG chunking & vector search
│   │   │       ├── dag_service.py              # Prerequisite graph cycle validation
│   │   │       ├── recommend.py                # 6-factor hybrid recommender
│   │   │       ├── knowledge_tracing.py        # Bayesian Knowledge Tracing (BKT)
│   │   │       ├── evidence_service.py         # Immutable competency audit logging
│   │   │       ├── reassessment_service.py     # Before/after delta evaluation
│   │   │       ├── syllabus_service.py         # Differential syllabus watcher
│   │   │       ├── question_version_service.py # Item bank lifecycle management
│   │   │       ├── certificate_service.py      # SL-2026 hash verification
│   │   │       ├── gamification_service.py     # Points & badge awarding
│   │   │       ├── notification_service.py     # System notifications
│   │   │       ├── audit_service.py            # Sanitized operational audit logger
│   │   │       └── igot_provider.py            # Provider pattern abstraction
│   │   ├── data/
│   │   │   ├── igot_mock_catalog.json          # Curated prototype training catalog
│   │   │   └── vector_indexes/                 # Persisted .npz dense vector indices
│   │   ├── scripts/
│   │   │   └── seed_comprehensive_demo.py      # Deterministic evaluation seed script
│   │   └── tests/                              # Pytest test suite (27 tests)
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── api/                # Axios API client with bearer token interceptors
│   │   │   ├── components/         # Layout, Radar chart, Navbar, Notification bell
│   │   │   ├── context/            # AuthContext & AuthModalContext
│   │   │   └── pages/              # Dashboard, Gaps, Quiz, Learn, Admin, VerifyCert
│   └── docs/                       # Complete institutional documentation suite
```
