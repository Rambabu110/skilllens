# SkillLens AI — SIH26101
**"Know the Learner. Detect the Gap. Build the Competency."**

An AI-enabled competency platform for India's Official Statistical System,
built around **FRAC** (Framework of Roles, Activities and Competencies) —
the same methodology Mission Karmayogi's iGOT platform actually uses.

Full PRD: see `SkillLens_AI_Master_PRD.md` in this folder.

---

## What's real vs. simulated (read this before a demo)

| Component | Status |
|---|---|
| ML competency model | **Real** — trained on the real OULAD dataset (28,785 students), R²=0.65, MAE=0.58 on a 1-5 scale |
| Quiz generation | **Real** — calls a live LLM (Gemini by default) on your uploaded material |
| Hybrid recommendation engine | **Real** — rule-based + TF-IDF similarity logic, genuinely computed |
| Gap detection | **Real** — computed against a FRAC-structured requirement tree |
| iGOT Karmayogi integration | **Simulated** — iGOT has no public API. `/mock-igot/*` endpoints mimic its expected contract (SSO, resource catalog, notifications, FRAC lookup) and are built so a real connector could be swapped in |
| FRAC role/competency data | **Synthetically authored**, structured to mirror the real FRAC methodology, scoped to 4 statistical-system roles |

Be upfront about this split if asked — it's what makes the project credible, not a weakness to hide.

---

## Advanced features (why this isn't a basic CRUD prototype)

| Feature | What it actually does |
|---|---|
| **Explainable AI (SHAP)** | `/competency/explain` breaks down exactly which factors (assessment history, engagement, etc.) pushed a learner's predicted competency level up or down, and by how much. Not a black box. |
| **Cohort/Admin Analytics** | `/admin/cohort-overview` (and the "Cohort view" nav tab, admin-only) aggregates gaps across every learner by position/department — the institutional, not-just-personal view that answers "scale of impact." Login as `admin.demo@skilllens.in` / `admin1234`. |
| **Zero-shot competency auto-tagging** | Any uploaded document (not just pre-linked modules) is classified by the LLM against the FRAC competency list, so its quiz result feeds back into real competency scores. |
| **AI-generated recommendation rationale** | `/recommendations?with_rationale=true` asks the LLM for a one-line, learner-specific reason each module was recommended. |
| **Multilingual quiz generation** | Quiz generation accepts `language: "en"` or `"hi"`, matching iGOT's real multi-language catalog. |
| **Competency trajectory forecasting** | `/gaps/trajectory` gives an honestly-labeled heuristic projection ("~3 weeks to close this gap at your current pace") based on quiz-score trend — deliberately simple and explainable, not a black-box time series model. |
| **Official Competency Passbook PDF** | `/export/passbook-pdf` generates a downloadable, government-report-styled PDF a judge can hold — not just a live screen. |

`Learner.behavioral_features` stores a real OULAD-sampled feature vector for the 3 demo accounts (their "behavioral twin"), so the SHAP explainer and trained model run on genuine data live in the demo — not the heuristic fallback. New real registrations use the heuristic path (clearly lower confidence) until they build up their own activity history.

**Known limitation, stated honestly:** the Gemini API call could not be network-tested from the sandboxed environment this was built in (allowlist excludes `generativelanguage.googleapis.com`). The code path is complete and reviewed, but test `/quiz/generate` yourself once `GEMINI_API_KEY` is set — that's the one piece needing your own environment to confirm end-to-end.

---

## Quick start (fastest path to a running demo)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and set:
```
GEMINI_API_KEY=your_key_here     # required for quiz generation — get one free at aistudio.google.com
```
Leave `DATABASE_URL` as the default SQLite for local testing, or point it at Supabase (see below).

```bash
python3 scripts/seed_data.py           # loads FRAC positions/roles/competencies + module catalog
python3 scripts/seed_demo_learners.py  # 3 ready-to-login demo accounts
python3 scripts/build_features.py      # only if you want to retrain the ML model (needs OULAD raw CSVs, see below)
python3 scripts/train_model.py         # only if retraining — a trained model is already included in app/ml/artifacts/

uvicorn app.main:app --reload --port 8000
```

Backend is now live at `http://localhost:8000` — interactive API docs at `http://localhost:8000/docs`.

**Demo logins** (password for all learner accounts: `demo1234`):
- `aditi.demo@skilllens.in` — Junior Statistical Officer, 1 yr experience (shows a critical gap, low-band OULAD twin)
- `rohan.demo@skilllens.in` — Data Analyst, 4 yrs experience (mid-band OULAD twin)
- `kavita.demo@skilllens.in` — Survey Supervisor, 7 yrs experience (high-band OULAD twin)
- `admin.demo@skilllens.in` / `admin1234` — training administrator (cohort analytics view)

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env       # points the frontend at http://localhost:8000 by default
npm run dev
```

Open `http://localhost:5173`, log in with any demo account above.

---

## Using Supabase instead of SQLite

1. Create a free project at supabase.com
2. Project Settings → Database → Connection string → URI (use the **Transaction pooler** string)
3. In `backend/.env`, set:
   ```
   DATABASE_URL=postgresql+psycopg2://postgres:<password>@<project-ref>.supabase.co:5432/postgres
   ```
4. Re-run `seed_data.py` and `seed_demo_learners.py` against the new database — everything else (routers, models, ML) works unchanged.

---

## Retraining the ML model on real OULAD data

The trained model is already included (`backend/app/ml/artifacts/competency_model.joblib`), so you don't need to do this to run the demo. To retrain from scratch:

1. Download **"Open University Learning Analytics Dataset"** from Kaggle (search OULAD, the version by user "Anil", 108 upvotes, Usability 10.0)
2. Unzip the 7 CSVs into `data/oulad_raw/` at the project root
3. Run:
   ```bash
   cd backend
   python3 scripts/build_features.py
   python3 scripts/train_model.py
   ```

---

## Live demo script (suggested walkthrough order — ~5 minutes)

1. Log in as `aditi.demo@skilllens.in` → show the **Passbook** (radar chart) — explain FRAC
2. Scroll down to **"Why this score"** — show the real SHAP breakdown, explain it's a genuine model explanation, not decoration
3. Go to **Gaps** → point out the critical gap and the trajectory estimate ("~N weeks to close at current pace")
4. Go to **Learning modules** → show the AI-generated one-line rationale under a recommended module, click "Generate quiz"
5. On the quiz screen, switch language to Hindi to show multilingual generation, then generate and take the quiz
6. Go back to **Passbook** → refresh, show the competency score moved based on the quiz result
7. Sign out, log in as `admin.demo@skilllens.in` → open **Cohort view** → show the department-wide gap aggregation — this is the "scale of impact" moment
8. Click **Download PDF** on any learner's passbook — hand judges the physical artifact
9. Open `http://localhost:8000/docs`, hit `/mock-igot/frac/{position_id}` live — the "we understood the real mechanism" moment

---

## Project structure

```
backend/
  app/
    core/       settings, DB session, JWT/security, auth dependency
    models/     SQLAlchemy models (FRAC schema)
    schemas/    Pydantic request/response schemas
    routers/    auth, profile, gaps, recommendations, quiz, mock_igot
    services/   competency scoring, hybrid recommender, LLM provider abstraction
    ml/         inference wrapper + trained model artifact
  scripts/      seed_data, seed_demo_learners, build_features, train_model
  data/         processed training features (small; raw OULAD not included, see above)
frontend/
  src/
    pages/      Login, Dashboard, Gaps, Learn, Quiz
    components/ Layout (spine nav), LedgerRow
    context/    AuthContext (JWT)
    api/        axios client
```
