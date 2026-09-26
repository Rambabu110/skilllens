# SkillLens AI — Complete API Reference Manual

**Platform**: SkillLens AI (SIH26101)  
**Base URL**: `http://localhost:8000` (or configured deployment URL)  
**Authentication Scheme**: Bearer JWT Token (`Authorization: Bearer <token>`)

---

## 1. Authentication & Identity (`/auth`)

### `POST /auth/login`
- **Description**: Authenticates a user with email and password.
- **Request Body**:
  ```json
  {
    "email": "aditi.demo@skilllens.in",
    "password": "demo1234"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "is_admin": false,
    "user": {
      "id": "uuid",
      "email": "aditi.demo@skilllens.in",
      "name": "Aditi Sharma",
      "position_title": "Junior Statistical Officer",
      "is_admin": false
    }
  }
  ```

### `POST /auth/firebase`
- **Description**: Verifies a client-side Firebase ID token, creates or syncs the user record, and issues a SkillLens JWT.
- **Request Body**:
  ```json
  {
    "firebase_id_token": "firebase_id_token_string"
  }
  ```

### `GET /auth/me`
- **Description**: Returns the authenticated profile and associated FRAC position.
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): LearnerOut object.

---

## 2. Competency Profile & FRAC (`/competency`)

### `GET /competency/profile`
- **Description**: Retrieves current competency levels, required benchmarks, confidence ratings, and mastery probabilities.
- **Response** (`200 OK`): Array of competency score items.

### `GET /competency/topics/{competency_id}`
- **Description**: Fetches granular topic-level breakdown and BKT mastery probabilities under a specific competency.

---

## 3. Cadre Gaps & Prerequisite DAG (`/gaps`)

### `GET /gaps`
- **Description**: Returns all competencies evaluated against job cadre requirements, sorted by gap size.
- **Response Fields**:
  - `competency_id`: UUID
  - `competency_name`: String
  - `required_level`: Float (1.0 to 5.0)
  - `current_level`: Float (1.0 to 5.0)
  - `gap_size`: Float
  - `status`: `"critical"` (gap >= 2.0), `"developing"` (gap >= 0.5), or `"strength"`
  - `mastery_probability`: Float (BKT)
  - `gap_type`: `"Deep Gap"` or `"Shallow Gap"`
  - `root_gap_competency`: Name of deepest prerequisite root cause
  - `depth`: Upstream prerequisite traversal depth

### `GET /gaps/graph`
- **Description**: Returns prerequisite Directed Acyclic Graph (nodes and edges) for SVG rendering.

---

## 4. True RAG & Assessment Engine (`/quiz`)

### `POST /quiz/upload`
- **Description**: Accepts a PDF, DOCX, or TXT file, parses text, splits into 800-1200 token chunks, computes SHA-256 hashes, generates 384-dimensional dense vectors, and saves `.npz` index.
- **Payload**: Multipart Form Data (`file`)
- **Response** (`200 OK`):
  ```json
  {
    "document_id": "uuid",
    "filename": "nss_guidelines.txt",
    "chunks_indexed": 3,
    "rag_ready": true
  }
  ```

### `POST /quiz/generate`
- **Description**: Performs top-k vector retrieval against uploaded document, grounds prompt strictly in retrieved chunks, and synthesizes questions with source citations.
- **Request Body**:
  ```json
  {
    "document_id": "uuid",
    "num_questions": 5,
    "language": "en"
  }
  ```
- **Response Question Object**:
  - `question`: Prompt text
  - `options`: Array of 4 strings
  - `correct_index`: Integer (0-3)
  - `explanation`: Reasoning text
  - `source_excerpt`: Verbatim citation from source document
  - `page_number`: Integer
  - `document_name`: String

### `POST /quiz/submit`
- **Description**: Evaluates learner answers, updates topic-level BKT estimates, logs immutable competency evidence, updates competency level via 60/40 EMA, and awards growth points.

### `POST /quiz/reassess/{competency_id}?score=85.0`
- **Description**: Submits post-learning reassessment score, compares against baseline, calculates gap reduction delta, and logs reassessment audit evidence.

---

## 5. Hybrid Recommendations & Learning Pathways

### `GET /recommendations?with_rationale=true`
- **Description**: Ranks training modules using the 6-factor hybrid formula with itemized explainability bullets and enrichment CPD mode.

### `GET /learning-path/overview`
- **Description**: Returns sequential learning pathway with steps marked as `RECOMMENDED`, `LOCKED`, `COMPLETED`, or `MASTERED`.

### `POST /learning-path/step/{step_id}/status`
- **Description**: Updates step completion status and dynamically unlocks subsequent dependent units.

---

## 6. Verifiable Credentials & PDF Passbook

### `POST /certificate/issue`
- **Description**: Issues a SkillLens Achievement Certificate with unique identifier (e.g. `SL-2026-CERT-XXXX`) and SHA-256 integrity hash.

### `GET /certificate/verify/{code}`
- **Description**: Public endpoint to verify certificate authenticity, recipient name, competency domain, and issue date without requiring login.

### `GET /export/passbook-pdf`
- **Description**: Generates and downloads an official ReportLab PDF Competency Passbook containing officer profile, FRAC scores, and evidence history.

---

## 7. Gamification & In-App Alerts

### `GET /gamification/summary`
- **Description**: Returns cumulative growth points, streak count, level tier, and awarded milestone badges.

### `GET /notifications?unread_only=false`
- **Description**: Returns real in-app alerts (gap alerts, recommendation updates, badge unlocks).

### `GET /notifications/unread-count`
- **Description**: Returns count of unread notifications for the header bell indicator.

---

## 8. Administrative Console (`/admin`)

### `GET /admin/stats`
- **Description**: Executive KPI metrics (total officers, total audited logins, active today, critical deficits).

### `GET /admin/learners`
- **Description**: A-to-Z cadre directory with filters and sorting.

### `GET /admin/audit-events`
- **Description**: Returns operational audit log records with sensitive data redacted.

### `POST /admin/syllabus/compare`
- **Description**: Accepts Syllabus v1 and v2, calculates set differential (ADDED/REMOVED/MODIFIED/UNCHANGED), and flags affected questions for review.

### `GET /admin/questions/versions`
- **Description**: Lists item bank question versions with filter by status (`ACTIVE`, `REVIEW`, `ARCHIVED`).
