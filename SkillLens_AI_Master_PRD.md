# SkillLens AI — Master Product Requirements Document
**SIH26101 | Theme: Smart Education System | Team: Zero Day Nextron (118786)**
*"Know the Learner. Detect the Gap. Build the Competency."*

---

## PART 0 — EXECUTIVE SUMMARY

Every SIH team building on this problem statement will pitch "AI-powered personalized learning." That sentence alone wins nothing. What wins is **specificity to how the Government of India's own competency system actually works**, backed by a system that runs live in front of judges.

The single most important finding from research for this PRD: **Mission Karmayogi does not use a generic "skill gap" model — it uses a named, official framework called FRAC (Framework of Roles, Activities and Competencies)**, where every civil service position is mapped to Roles → Activities → Competencies, and competencies are classified into three types: **Behavioural, Functional, and Domain**. This is documented in DoPT's own NPCSCB policy and is the actual backbone of iGOT.

Almost no competing team will know this or build to it — most will build a generic "quiz score → recommend course" system and call it AI. **SkillLens AI's core differentiator is that its competency engine is FRAC-structured, not generic**, so it speaks the government's own institutional language. This is the difference between "another EdTech AI demo" and "a system that looks like it was built by people who read the actual policy."

Everything below is built around that insight.

---

## PART 1 — RESEARCH FOUNDATION (why each decision was made)

### 1.1 What Mission Karmayogi / iGOT Karmayogi actually is
- Launched 2020 (Cabinet approval), platform live since 2022, run by Karmayogi Bharat (an SPV under the Companies Act, owned by Government of India), under DoPT.
- Over 1,600–2,400+ courses, in 16 languages, 3 crore+ enrollments, 2.2 crore+ completions.
- Learning philosophy: **70:20:10 model** — 70% experiential, 20% social/peer, 10% formal structured learning.
- Technical philosophy: open-source, microservices-first architecture, telemetry-driven, AI-assisted content moderation and tagging (their own "Vega" digital assistant).
- Core competency methodology: **FRAC** — every government position gets "FRAC-ed": mapped to Roles, then Activities within each role, then Competencies (Behavioural / Functional / Domain) needed to perform those activities. Learners get a **Competency Passbook** showing their mapped competencies and levels.

**Implication for us:** our "role-requirement matrix" should not be an arbitrary skill list — it should literally be structured as Position → Role(s) → Activities → Competencies (tagged by type), mirroring FRAC. This is a research-backed, defensible design decision, not a guess.

### 1.2 What data realistically exists for us to use
- **iGOT's real data is not public** — internal government platform, no open API, no downloadable learner dataset. Any claim of "real iGOT integration" would be false and judges in this domain (many SIH panels include government officials) can catch that instantly.
- **OULAD (Open University Learning Analytics Dataset)** is the best real substitute for the *learning-behavior and assessment* half of the problem: 32,593 real students, 22 real course presentations, VLE clickstream (10.6M interaction records), demographics, and assessment scores, CC-BY 4.0 licensed, available on Kaggle and UCI ML Repository. It gives us **genuine ML training data** for "does this learner's behavior/performance pattern indicate a competency level."
- OULAD does **not** have government roles, FRAC competencies, or civil-service context — that half must be synthetically constructed, seeded with realistic FRAC-style structure from public DoPT/CBC documents (which are public policy PDFs, not user data, so this is legitimate to reference).

### 1.3 What SIH judges actually score on
Public evaluation guidelines and post-mortems consistently list: **novelty/innovation, technical complexity & feasibility, clarity of the idea, practicability, sustainability, scale of impact, user experience, and potential for future development** — scored numerically per round and combined. Recent guidance (2026 cycle) is explicit that **judges expect real AI integration and a live, non-hardcoded demo** — teams that fake a demo get caught and penalized; a stable working MVP consistently beats an ambitious incomplete build.

**Implication:** prioritize (a) one fully-live, un-hardcoded flow over five half-built features, (b) an honest, explicit story about what's real (OULAD-trained ML, real LLM calls) vs simulated (iGOT adapter), and (c) a visible articulation of scale-up path (Part 8).

---

## PART 2 — PRODUCT DEFINITION

### 2.1 Problem statement (verbatim intent)
Build an AI-enabled learning platform that identifies competency gaps, recommends personalized training via iGOT Karmayogi, and generates quizzes/MCQs from uploaded material, for capacity building in India's Official Statistical System.

### 2.2 Users
| Persona | Need |
|---|---|
| Government learner (e.g. Junior Statistical Officer) | Know exactly which competencies they're missing for their role, get a clear path to close gaps |
| Training administrator / CBP provider | See aggregate competency gaps across a cadre, know what content to commission |
| iGOT/CBC-style ecosystem (simulated) | Receive standardized competency-gap signals to serve the right course from its catalog |

### 2.3 Non-goals for the prototype (explicitly out of scope)
- Real iGOT SSO/data (impossible to access — mocked, disclosed)
- Multi-tenant, multi-department scaling (architecture supports it later, not built now)
- Mobile app (React web only for prototype; Android mentioned in original deck deferred to roadmap)
- Content moderation / plagiarism detection (iGOT already does this — not our problem to solve)

---

## PART 3 — SYSTEM ARCHITECTURE

```
                        ┌───────────────────────────┐
                        │     React (Vite) Frontend   │
                        │  Login · Dashboard · Quiz UI │
                        │  Competency Passbook view     │
                        └──────────────┬───────────────┘
                                       │ REST (JSON) + JWT
                        ┌──────────────▼───────────────┐
                        │        FastAPI Backend         │
                        │  /auth  /profile  /gaps         │
                        │  /recommendations  /quiz         │
                        └───┬─────────┬─────────┬────────┘
                            │         │         │
              ┌─────────────▼─┐ ┌─────▼──────┐ ┌▼─────────────────┐
              │ ML Competency  │ │ Quiz Engine │ │ Mock iGOT Adapter  │
              │ Engine          │ │ (LLM call)  │ │ /mock-igot/*        │
              │ scikit-learn    │ │ Gemini API  │ │ SSO · catalog ·     │
              │ trained on OULAD│ │             │ │ notifications        │
              └─────────────┬──┘ └─────────────┘ └────────────────────┘
                            │
                     ┌──────▼───────┐
                     │  PostgreSQL/  │
                     │  SQLite DB    │
                     │  FRAC schema  │
                     └───────────────┘
```

### 3.1 Finalized tech stack (simplified from the original deck for buildability)

| Layer | Choice | Reasoning |
|---|---|---|
| Backend framework | FastAPI (Python 3.11) | Async, auto-docs (Swagger), fast to build, matches original deck |
| ORM | SQLAlchemy + Alembic | Migrations, matches deck |
| Validation | Pydantic | Matches deck, needed for FastAPI anyway |
| Auth | JWT (python-jose) + bcrypt | Simple, no external dependency |
| Database | SQLite for prototype, PostgreSQL-ready schema | Zero setup for judges to run locally; one config flag away from Postgres |
| ML | scikit-learn, pandas, numpy | Matches deck; sufficient for classification, no need for deep learning here |
| LLM | Gemini API (free tier) | Cost-effective for prototype; abstracted behind an interface so OpenAI can be swapped in one file |
| PDF parsing | pypdf / pdfplumber | Extract text from uploaded learning material |
| Frontend | React (Vite) + Tailwind + Recharts | Fast build, charts for competency dashboard |
| Containerization | Docker (final polish stage only) | One-command judge setup, not needed mid-build |

**Dropped from original deck and why:** MongoDB (no unstructured-data need that SQL+JSONB can't cover), Redis (no caching need at prototype scale/traffic), LangChain (a single-purpose prompt→JSON call doesn't need an orchestration framework — adds a dependency and a debugging layer for zero benefit at this scale), Android (out of scope, see 2.3).

---

## PART 4 — DATA MODEL (FRAC-aligned)

### 4.1 Core entities
- **Learner**: id, name, role_id, qualification, experience_years, joining_date
- **Position** (FRAC term): id, title (e.g. "Junior Statistical Officer"), department
- **Role**: id, position_id, role_name (a position can map to multiple roles, per FRAC)
- **Activity**: id, role_id, activity_description
- **Competency**: id, activity_id, name, type (`behavioural` | `functional` | `domain`), required_level (1-5)
- **LearnerCompetencyScore**: learner_id, competency_id, current_level (derived from ML model), last_updated
- **LearningModule** (stand-in for iGOT catalog): id, title, competency_tags[], duration, level
- **Assessment / QuizAttempt**: id, learner_id, module_id or uploaded_doc_id, questions[], score, timestamp

### 4.2 Dataset sourcing per entity
- Learner behavioral/performance features → derived from **OULAD** (studentInfo, studentAssessment, studentVle tables) mapped onto our schema's scoring fields
- Position/Role/Activity/Competency seed data → **synthetically authored**, structured to mirror real FRAC documentation (public DoPT PDFs), focused on 4–6 roles relevant to "Official Statistical System" (e.g. Statistical Officer, Data Analyst, Survey Supervisor, Research Investigator)
- LearningModule catalog → **synthetically authored**, 30–50 entries, tagged to competencies — explicitly disclosed as a stand-in for the real iGOT catalog

---

## PART 5 — CORE MODULE SPECIFICATIONS

### 5.1 Competency Profiling Engine
- **Input features** (from OULAD-trained model): engagement score (click patterns → normalized activity index), assessment score history, demographic band → **output**: a predicted performance/competency band (Low/Medium/High) per competency area
- **Model**: start with `RandomForestClassifier` or `GradientBoostingClassifier` (scikit-learn) — interpretable, fast to train, good baseline accuracy on OULAD-style tabular data; no need for a neural net at this scale, and interpretability matters more than 2% accuracy for a judge Q&A
- **Output structure**: `{learner_id, competency_id, predicted_level, confidence}`

### 5.2 Gap Detection Engine
- For each Competency required by the learner's mapped Role (via Position → Role → Activity → Competency chain), compare `required_level` vs `predicted_level`/`current_level`
- Classify: **Critical gap** (required - current ≥ 2), **Developing** (gap = 1), **Strength** (current ≥ required)
- Output ranked list, sorted by gap size × competency importance weight

### 5.3 Hybrid Recommendation Engine
- **Rule layer**: each Competency pre-mapped to eligible LearningModules (seed data)
- **Content-similarity layer**: TF-IDF or sentence-embedding similarity between the gap's competency description and module descriptions, for cases with no exact rule match
- **Blend**: rule matches ranked first, similarity matches fill remaining recommendation slots
- This is honestly describable as a "hybrid recommender" — legitimate terminology, doesn't overclaim collaborative filtering (which needs a real user base we don't have)

### 5.4 AI Assessment & Quiz Engine (the most "wow" live-demo feature)
- Flow: learner uploads PDF/text → backend extracts text (pypdf) → chunk if long → send to Gemini with a strict, structured prompt → parse JSON response → store & serve
- **Prompt design principle**: force structured JSON output, require the explanation field (this is what makes it "AI assessment," not just "AI quiz") — e.g. ask for exactly N questions, 4 options each, 1 correct answer index, a 1-2 line explanation of why it's correct, and a difficulty tag
- Auto-grade on submission (compare selected index), instant feedback with the explanation shown
- Every submission → new `QuizAttempt` row → triggers Competency re-score

### 5.5 Continuous Competency Intelligence
- On every `QuizAttempt` insert, synchronously recompute the learner's competency vector for tags matched to that quiz's module/competency tags
- Recommendation list regenerates automatically, dashboard reflects new state on next fetch (no background job/queue needed at prototype scale — keep it simple and debuggable for a live demo)

---

## PART 6 — MOCK iGOT ADAPTER (explicit contract)

Presented to judges as: *"A mock adapter built to iGOT's expected integration contract, since iGOT has no public API — this layer is swappable with a real Karmayogi Bharat connector on institutional access."*

| Endpoint | Purpose | Mock behavior |
|---|---|---|
| `POST /mock-igot/sso/validate` | Simulates iGOT SSO token check | Returns a structurally realistic success/failure JSON |
| `GET /mock-igot/resources?competency=X` | Simulates pulling course catalog | Returns seeded modules matching the competency tag |
| `POST /mock-igot/notify` | Simulates iGOT notification service | Logs event, returns ack |
| `GET /mock-igot/frac/{position_id}` | Simulates a FRAC lookup for a position | Returns our seeded Position→Role→Activity→Competency tree |

This last endpoint is the one worth highlighting to judges — it demonstrates you understood FRAC is the actual mechanism, not just "iGOT = course website."

---

## PART 7 — PHASE-WISE BUILD PLAN

### Phase 0 — Setup (before any feature code)
- Repo structure, virtualenv, FastAPI skeleton, SQLAlchemy models from Part 4, Alembic init
- Download OULAD from Kaggle, initial exploratory notebook (pandas) to confirm which columns map to our schema

### Phase 1 — Auth & Core Data
- Register/login endpoints, JWT issuing/validation
- Seed script: Positions/Roles/Activities/Competencies (FRAC-style, 4-6 roles) + LearningModule catalog
- CRUD for Learner profile

### Phase 2 — ML Competency Model
- Clean OULAD → train classifier → serialize model (joblib)
- `/competency/profile` endpoint: given a learner, return predicted competency levels
- Unit test: confirm predictions vary sensibly with input changes (judges may ask you to prove it's not hardcoded)

### Phase 3 — Gap Detection + Recommendation
- `/gaps` endpoint: FRAC chain traversal + comparison logic
- `/recommendations` endpoint: hybrid rule + similarity logic

### Phase 4 — Quiz Engine (LLM)
- PDF upload endpoint, text extraction
- Gemini API integration behind an abstracted `LLMProvider` interface (so swapping providers is a one-file change)
- Quiz CRUD, submission, auto-grading, competency re-score trigger

### Phase 5 — Mock iGOT Adapter
- Build the 4 endpoints in Part 6, wire `/recommendations` to call `/mock-igot/resources` instead of querying the seed table directly (this makes the "integration" structurally real even though the data is mocked)

### Phase 6 — Frontend
- Login/Register, Competency Passbook view (radar chart via Recharts), Gap list, Recommended modules, Quiz-taking UI, Progress-over-time chart
- Apply the frontend-design skill during this phase for a distinctive, non-templated look

### Phase 7 — Polish & Demo Readiness
- Seed realistic demo data (2-3 learner personas with visibly different gap profiles, so the live demo shows variety)
- One-command run script (and Docker, if time allows)
- README documenting what's real (OULAD-trained ML, live LLM calls) vs simulated (iGOT adapter) — write this proactively, don't wait for a judge to ask
- Rehearse the exact live-demo click path end to end, twice, on a clean machine

---

## PART 8 — JUDGING CRITERIA MAPPING (use this to write your pitch deck)

| SIH criterion | How SkillLens AI answers it |
|---|---|
| Novelty/Innovation | FRAC-structured competency engine — not a generic skill-gap tool, mirrors GoI's actual civil-service competency methodology |
| Technical complexity | Real ML model trained on real data (OULAD) + real LLM-based generative assessment, not rule-only |
| Feasibility | Every component uses freely available tech (Kaggle data, free-tier LLM, open-source stack); no dependency on inaccessible government systems to function |
| Practicability | Mock adapter is explicitly designed to the real integration contract — a genuine institutional rollout swaps one adapter file, not a rebuild |
| Sustainability | 70:20:10-aligned recommendations (matches iGOT's own pedagogy) means it slots into existing learning culture, not a parallel system |
| Scale of impact | Framework is role-agnostic — extending beyond Official Statistics to any FRAC-mapped cadre is a data-seeding exercise, not an architecture change |
| User experience | Live dashboard, instant quiz feedback with explanations, visible progress over time |
| Future work | Real iGOT SSO/API integration on institutional access; add peer/collaborative recommendation once a real user base exists; multilingual quiz generation (iGOT supports 16 languages — mention this explicitly as the next milestone) |

---

## PART 9 — RISK REGISTER

| Risk | Mitigation |
|---|---|
| Judges ask "is this really connected to iGOT?" | Answer honestly per Part 6's framing — this builds credibility, not doubt |
| LLM API rate limits/downtime during live demo | Cache 2-3 pre-generated quiz examples as an offline fallback, disclosed only if needed |
| OULAD model looks like a black box under questioning | Prepare a 1-slide feature-importance chart (scikit-learn gives this for free) — shows judges you understand your own model |
| Time runs out before Phase 6/7 | Phases 1-5 (backend + ML + LLM) are the substance; a simpler frontend (even just Swagger UI + Postman-style walkthrough) still proves the working system if frontend time is squeezed |

---

## PART 10 — WHAT HAPPENS NEXT

This document is the reference for the whole build. Suggested immediate next step: **Phase 0 + Phase 1** — repo skeleton, DB schema, seed data. I'll write the actual code, you run it and give me error output/screenshots when something breaks; that loop is faster than me explaining commands for you to type blind.
