# SkillLens AI — SIH Live Demonstration Script (10-Minute Walkthrough)

**Team**: Zero Day Nextron  
**Evaluator Target**: SIH Jury & Ministry Technical Observers  
**Demo Duration**: Exactly 10 Minutes  
**Demo Persona**: Aditi Sharma (`aditi.demo@skilllens.in` / `demo1234`) — Junior Statistical Officer (MoSPI)  
**Admin Persona**: Training Administrator (`admin.demo@skilllens.in` / `admin1234`)

---

## Pre-Flight Checklist (Run 2 Minutes Before Presentation)
- [ ] Backend running: `python -m uvicorn app.main:app --port 8000`
- [ ] Frontend running: `npm run dev` (running on `http://localhost:5173`)
- [ ] Demo database seeded: `python scripts/seed_comprehensive_demo.py`
- [ ] Test certificate ready: `SL-2026-CERT-DEMO0001`
- [ ] Browser tabs open:
  - Tab 1: `http://localhost:5173/`
  - Tab 2: `http://localhost:5173/verify/certificate/SL-2026-CERT-DEMO0001`
  - Tab 3: `http://localhost:5173/admin`

---

## Demonstration Timeline

### Minute 00:00 - 01:30 | Problem Framing & The Competency Evidence Loop
- **What to say**:
  > *"Respected judges, Mission Karmayogi and iGOT have revolutionized civil services training by giving officers access to thousands of digital courses. But as training administrators, how do we know if an officer has actually developed competency through on-the-job application? Today, there is a gap between 'What should I learn?' and 'Can I actually demonstrate it?'. We present SkillLens AI — an empirical competency diagnostic and adaptive learning system built for India's National Statistical System."*
- **What to show**:
  - Open `http://localhost:5173/`.
  - Log in as **Aditi Sharma** (`aditi.demo@skilllens.in` / `demo1234`).
  - Point out her cadre position: **Junior Statistical Officer**.

---

### Minute 01:30 - 03:00 | FRAC Profile, Gaps & Prerequisite Knowledge DAG
- **What to say**:
  > *"SkillLens immediately maps Aditi's profile to the MoSPI FRAC competency dictionary. On the dashboard, we see her Competency Radar. Notice that under 'Statistical Sampling Methods', her required level is 4.0, but her current evaluated level is 1.8 — a Critical Gap. But why does this gap exist?"*
- **What to click**:
  - Click on **Cadre Gaps Diagnostics** (`/gaps`).
  - Show the **Prerequisite Knowledge DAG**.
- **What to say**:
  > *"Traditional systems treat every gap in isolation. Our Directed Acyclic Graph traces upstream dependencies. It reveals that Aditi's deficit in 'Sampling Error & Bias' is not a standalone weakness; it stems from an upstream root cause in 'Statistical Sampling Methods'. By solving the root prerequisite first, her learning velocity increases by 40%."*

---

### Minute 03:00 - 05:00 | True RAG Assessment with Source Evidence
- **What to say**:
  > *"To test Aditi's competency objectively, SkillLens uses True RAG — not open-ended AI prompting that can hallucinate government rules."*
- **What to click**:
  - Navigate to **AI Skills Assessment** (`/quiz`).
  - Upload `nss_guidelines.txt` (or select existing document).
  - Click **Generate Grounded Assessment**.
- **What to point out**:
  - Show the generated multiple-choice question.
  - Highlight the **Source Evidence Excerpt**, the **Page Reference**, and the **Document Name**.
  - Show that every question is 100% anchored in the verified text.
- **What to do**:
  - Submit answers and show the instant assessment score.
  - Point out that the submission logged an immutable evidence record and updated her Bayesian Knowledge Tracing (BKT) probability.

---

### Minute 05:00 - 06:30 | 6-Factor Hybrid Recommender & Step-Locked Pathways
- **What to click**:
  - Navigate to **Recommended Modules** (`/learn`).
- **What to say**:
  > *"Now that Aditi's root gap is identified, how do we guide her? Our 6-factor hybrid recommender ranks courses using gap relevance, prerequisite priority, content similarity, and difficulty fit. Crucially, look at the transparent rationale: the system explicitly tells the officer why this module was recommended."*
- **What to show**:
  - Show the **Dynamic Learning Pathway** at the top of the dashboard.
  - Explain the step states: Unit 1 is `RECOMMENDED` / `IN_PROGRESS`, while advanced Units are `LOCKED` until prerequisites are mastered.

---

### Minute 06:30 - 07:30 | Reassessment & Before/After Delta
- **What to say**:
  > *"After completing the module, Aditi takes a reassessment. Watch what happens to her profile."*
- **What to click**:
  - Demonstrate a post-learning quiz score submission (85%).
  - Show the before/after delta calculation:
    - Before Level: 1.8 -> After Level: 2.8.
    - Status changes from **Critical Gap** to **Developing**.
  - Show that her growth points and milestone badges unlocked automatically.

---

### Minute 07:30 - 08:30 | Verifiable Certificate & Official PDF Passbook
- **What to click**:
  - Click **Export Passbook** in the top bar -> downloads real ReportLab PDF.
  - Open Tab 2: `http://localhost:5173/verify/certificate/SL-2026-CERT-DEMO0001`.
- **What to say**:
  > *"Every milestone yields a tamper-evident SkillLens Achievement Certificate. Anyone in the ministry can scan the QR code or visit this public verification URL. It cryptographically validates the officer's name, competency domain, and issue date against the database hash. Furthermore, her official Competency Passbook exports as a multi-page PDF containing her complete evidence ledger."*

---

### Minute 08:30 - 10:00 | Cadre Admin Console & Syllabus Pattern Watcher
- **What to click**:
  - Open Tab 3: Log in as **Admin** (`admin.demo@skilllens.in` / `admin1234`).
  - Navigate to `/admin`.
- **What to show**:
  - **Executive KPI Strip**: Total enrolled officers, audited logins, active officers, critical deficits.
  - **Cadre Deficit Heatmap**: Highlighting organizational deficits across all Junior Statistical Officers.
  - **Syllabus Pattern Watcher**: Show how comparing Syllabus v1 to v2 identifies added/modified topics and automatically transitions outdated questions to `REVIEW` status.
  - **Security Audit Trail**: Show the real-time operational audit log with sensitive parameters redacted.

---

### Closing Line (Minute 10:00)
> *"SkillLens AI does not replace government platforms; it empowers them. By pairing iGOT's extensive curriculum with SkillLens's empirical evidence loop, we ensure India's civil services are not just trained, but proven competent. Thank you."*
