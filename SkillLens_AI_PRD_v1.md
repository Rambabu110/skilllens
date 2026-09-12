# SkillLens AI — Product Requirements Document
**SIH26101 | Team Zero Day Nextron (118786) | Theme: Smart Education System**

---

## 1. What We're Building

A working prototype (not a slideshow) of an AI system that:
1. Builds a learner's competency profile from role, qualifications, experience, past training, assessment scores
2. Detects skill gaps vs role-required competencies
3. Recommends a personalized learning path (simulating iGOT Karmayogi resources)
4. Generates MCQs/quizzes from uploaded learning material using a real LLM
5. Re-scores competency after every quiz/activity and updates the path

Judges will see: register → take assessment → see gap analysis → get recommended modules → upload a PDF → get an AI-generated quiz → take it → see updated competency dashboard. That full loop, live, is the demo.

---

## 2. Scope Decisions (locked)

| Question | Decision | Why |
|---|---|---|
| Quiz generation | Real LLM API (OpenAI or Gemini, key provided by you) | Genuine AI use, not templated — this is what judges probe hardest |
| iGOT Karmayogi | Mocked adapter layer (`igot_mock_service`) | No public API exists; mock is standard practice, documented as swappable |
| Training data | OULAD (Kaggle, real) + synthetic role/qualification layer | Real behavioral/assessment data for the ML model, synthetic for govt-officer context OULAD lacks |

---

## 3. Architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  React Frontend  │◄────►│   FastAPI Backend     │◄────►│   PostgreSQL     │
│  (Vite + Tailwind)│      │  (REST + JWT auth)    │      │  (learner data)  │
└─────────────────┘      └───────────┬──────────┘      └─────────────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
            ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐
            │ ML Engine       │ │ Quiz Engine   │ │ iGOT Mock Adapter │
            │ (scikit-learn)  │ │ (LLM API call)│ │ (fake SSO/resources)│
            │ competency model│ │ from uploaded │ │                    │
            │ + gap detection │ │ material       │ │                    │
            └────────────────┘ └──────────────┘ └──────────────────┘
```

**Simplified from the original deck**: dropping MongoDB, Redis, Android, LangChain, Docker for the prototype phase — they add integration overhead without demo value. PostgreSQL alone covers structured + semi-structured (JSONB) needs. Add Docker only at the very end for one-command judge setup, if time permits.

### Finalized stack
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Pydantic, JWT (python-jose)
- **DB**: PostgreSQL (SQLite fallback for zero-setup local demo)
- **ML**: scikit-learn, pandas, numpy — classification model for competency level
- **LLM**: OpenAI or Gemini API, called directly (no LangChain needed for a single-purpose quiz-gen call)
- **Frontend**: React (Vite) + Tailwind
- **Mock service**: a separate FastAPI router simulating iGOT endpoints

---

## 4. Core Modules

### 4.1 Competency Profiling
- Input: role, qualification, years of experience, past training records, quiz scores
- Output: a competency vector per skill area (e.g. `{data_analysis: 0.6, statistical_methods: 0.4, ...}`)
- Built as a scikit-learn classifier trained on OULAD-derived features (engagement + assessment score → performance band), extended with a rules layer mapping role → required skill weights

### 4.2 Gap Detection Engine
- Compares learner's competency vector to a **role-requirement matrix** (a config table you define per role — this is where "Official Statistical" domain specificity goes)
- Output: ranked list of gaps (critical / developing / strength)

### 4.3 Recommendation Engine (hybrid)
- Rule-based: gap → mapped module (from a seeded catalog, standing in for iGOT's real catalog)
- Content-based: TF-IDF/embedding similarity between gap description and module descriptions
- This hybrid is legitimate and simple enough to build in the time you have — no need for real collaborative filtering with no user base

### 4.4 AI Assessment & Quiz Engine
- Learner uploads PDF/text material
- Backend extracts text (pypdf) → sends to LLM with a strict prompt: "Generate N MCQs with 4 options, correct answer, explanation, in JSON"
- Store quiz, serve to frontend, auto-grade on submission, feed score back into competency model

### 4.5 Continuous Competency Intelligence
- Every quiz submission triggers a re-score job (synchronous is fine for a prototype — no need for Celery/queues)
- Competency vector + recommendation list update, dashboard reflects it live

---

## 5. Mock iGOT Karmayogi Adapter — Spec

Since no real access exists, build a small FastAPI service (`/mock-igot/*`) that mimics what a real integration would call:

- `POST /mock-igot/sso/validate` → returns a fake but structurally realistic token validation response
- `GET /mock-igot/resources?skill=X` → returns a seeded JSON catalog of "courses" (title, duration, level, url placeholder)
- `POST /mock-igot/notify` → logs a "notification sent" event

Document this clearly in the PPT/report as: *"Integration layer built to iGOT's expected contract; swappable with live endpoints upon MeitY/DoPT API access."* This is honest and is exactly how real hackathon-to-production integrations are described — judges respect this framing far more than a hand-waved "we integrated with iGOT."

---

## 6. Dataset Plan

1. **OULAD** (Kaggle: `open-university-learning-analytics-dataset`) — real learner demographics, VLE engagement, assessment results. Use this to train the base competency/performance classifier.
2. **Synthetic augmentation layer** — generate ~500–1000 synthetic learner profiles with role/qualification/training-history fields (OULAD doesn't have these), using realistic distributions so the role-based gap detection has something to work against.
3. **Seed content catalog** — 30–50 hand-written "learning module" entries (title, skill tags, level) to stand in for iGOT's real catalog, used by the recommendation engine.

This combination gives you a real, defensible ML component (not fabricated) plus the domain-specific data the problem statement actually needs, which no public dataset covers.

---

## 7. Build Phases

| Phase | Deliverable |
|---|---|
| 1 | DB schema + FastAPI auth (register/login/JWT) |
| 2 | Competency model trained on OULAD + synthetic data, exposed as `/competency/profile` |
| 3 | Gap detection + recommendation engine (`/gaps`, `/recommendations`) |
| 4 | Quiz engine — upload → LLM → MCQ → submit → grade (`/quiz/*`) |
| 5 | Mock iGOT adapter wired into recommendation engine |
| 6 | React frontend: login, dashboard, quiz UI, progress charts |
| 7 | Polish: seed data, demo script, README, one-command run |

---

## 8. What I still need from you before Phase 1 starts
- LLM API key (OpenAI or Gemini — your pick) when we get to Phase 4
- Confirm: SQLite for local demo simplicity, or do you want real PostgreSQL set up?
- Any specific "Official Statistical" domain roles/skills you want baked into the role-requirement matrix (e.g. specific govt job titles), or should I use realistic placeholders?
