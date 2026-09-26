# SkillLens AI — Database Schema & Data Dictionary

**Database Management System**: PostgreSQL 15+ (Supabase) / SQLite 3 Fallback  
**ORM**: SQLAlchemy 2.0  
**Design Standard**: 3NF Normalized with Immutable Audit Logging

---

## 1. Entity-Relationship Diagram (ERD)

```
[Positions] 1 ───────< [Learners] 1 ───────< [LearnerCompetencyScore]
      │                      │                           │
      │ 1                    │ 1                         │ *
      v *                    v *                         v 1
[PositionCompetency]   [LearnerTopicMastery]       [Competencies]
      │                      │                           │
      │ *                    │ *                         │ 1
      v 1                    v 1                         v *
[Competencies] 1 ───< [Topics] 1 ───< [TopicPrereq] [CompetencyPrereq]
      │
      ├───< [ModuleCompetency] >─── [LearningModules] 1 ───< [LearningPathStep]
      │
      ├───< [CompetencyEvidence] >─── [QuizAttempt] >─── [Quiz] >─── [UploadedDocument]
      │                                                                   │
      │                                                                   └───< [DocumentChunk]
      └───< [Certificate]
```

---

## 2. Table Specifications

### 2.1 Core Identity & Positions
- **`positions`**: Government statistical cadres (e.g. *Junior Statistical Officer*, *Data Analyst*).
  - Columns: `id` (PK, UUID), `title` (VARCHAR 150), `department` (VARCHAR 100), `description` (TEXT).
- **`learners`**: Civil service personnel enrolled in the competency system.
  - Columns: `id` (PK, UUID), `name` (VARCHAR 100), `email` (VARCHAR 150, UNIQUE), `hashed_password` (VARCHAR 255), `position_id` (FK `positions.id`), `qualification` (VARCHAR 100), `experience_years` (FLOAT), `is_admin` (BOOLEAN), `login_count` (INT), `last_login_at` (TIMESTAMP), `created_at` (TIMESTAMP).

### 2.2 FRAC Competency Framework & Topics
- **`competencies`**: MoSPI/FRAC defined competencies.
  - Columns: `id` (PK, UUID), `name` (VARCHAR 150), `type` (ENUM: `behavioral`, `domain`, `functional`), `required_level` (FLOAT 1.0 - 5.0), `description` (TEXT).
- **`position_competencies`**: Maps standard required level per cadre.
  - Columns: `position_id` (FK `positions.id`), `competency_id` (FK `competencies.id`), `required_level` (FLOAT).
- **`competency_prereqs`**: Prerequisite edges between competencies forming a DAG.
  - Columns: `competency_id` (FK), `prereq_competency_id` (FK), `confidence` (FLOAT).
- **`topics`**: Granular knowledge sub-units under each competency.
  - Columns: `id` (PK, UUID), `competency_id` (FK `competencies.id`), `name` (VARCHAR 150), `description` (TEXT), `sequence_order` (INT).
- **`learner_competency_scores`**: Current evaluated level per officer.
  - Columns: `id` (PK), `learner_id` (FK), `competency_id` (FK), `current_level` (FLOAT), `confidence` (FLOAT), `mastery_probability` (FLOAT), `last_updated` (TIMESTAMP).
- **`learner_topic_mastery`**: Fine-grained BKT mastery state.
  - Columns: `id` (PK), `learner_id` (FK), `topic_id` (FK), `mastery_probability` (FLOAT 0.0-1.0), `attempts` (INT), `correct` (INT), `last_assessed` (TIMESTAMP).

### 2.3 Evidence & Continuous Diagnostics
- **`competency_evidence`**: Immutable ledger of assessment performance.
  - Columns: `id` (PK, UUID), `learner_id` (FK), `competency_id` (FK), `assessment_type` (VARCHAR: `MCQ`, `VIVA`, `SIMULATION`), `assessment_id` (VARCHAR), `score` (FLOAT), `before_level` (FLOAT), `after_level` (FLOAT), `evidence_reference` (JSON), `timestamp` (TIMESTAMP).
- **`uploaded_documents`**: Source materials parsed for True RAG.
  - Columns: `id` (PK, UUID), `filename` (VARCHAR 255), `content_type` (VARCHAR 50), `extracted_text` (TEXT), `uploaded_by` (FK `learners.id`), `created_at` (TIMESTAMP).
- **`document_chunks`**: Segmented text chunks with cryptographic hashes.
  - Columns: `id` (PK, UUID), `document_id` (FK), `chunk_index` (INT), `page_number` (INT), `text` (TEXT), `section` (VARCHAR 100), `heading` (VARCHAR 150), `token_count` (INT), `chunk_hash` (VARCHAR 64).

### 2.4 Learning Pathways & Training Catalog
- **`learning_modules`**: Courses and training modules.
  - Columns: `id` (PK, UUID), `title` (VARCHAR 200), `description` (TEXT), `duration_minutes` (INT), `level` (FLOAT), `source` (VARCHAR: `mock_igot`, `curriculum`), `external_url` (VARCHAR 255).
- **`module_competencies`**: Competencies addressed by each module.
  - Columns: `module_id` (FK), `competency_id` (FK).
- **`learning_path_steps`**: Sequenced step-locked learning pathway.
  - Columns: `id` (PK, UUID), `learner_id` (FK), `module_id` (FK), `step_order` (INT), `status` (VARCHAR: `RECOMMENDED`, `LOCKED`, `COMPLETED`, `MASTERED`), `unlocked_at` (TIMESTAMP), `completed_at` (TIMESTAMP).

### 2.5 Syllabus Versioning & Governance
- **`syllabus_versions`**: Historical versions of institutional curriculum.
  - Columns: `id` (PK, UUID), `title` (VARCHAR 200), `version` (INT), `content_hash` (VARCHAR 64), `parsed_topics` (JSON), `created_at` (TIMESTAMP).
- **`question_versions`**: Item bank questions with review lifecycle.
  - Columns: `id` (PK, UUID), `question_id` (VARCHAR), `quiz_id` (FK), `version` (INT), `status` (VARCHAR: `ACTIVE`, `REVIEW`, `ARCHIVED`), `question_data` (JSON), `source_document_id` (FK), `created_at` (TIMESTAMP), `superseded_at` (TIMESTAMP).

### 2.6 Verifiable Credentials & System Integrity
- **`certificates`**: Verifiable completion certificates.
  - Columns: `id` (PK, UUID), `verification_code` (VARCHAR 50, UNIQUE), `learner_id` (FK), `competency_id` (FK), `title` (VARCHAR 200), `certificate_type` (VARCHAR), `issue_date` (TIMESTAMP), `certificate_hash` (VARCHAR 64), `metadata_payload` (JSON).
- **`learner_points`**: Gamification growth points log.
  - Columns: `id` (PK, UUID), `learner_id` (FK), `points` (INT), `event_type` (VARCHAR), `description` (VARCHAR 255), `created_at` (TIMESTAMP).
- **`badges` & `learner_badges`**: Milestone achievements.
- **`notifications`**: In-app event alerts for learners.
- **`audit_events`**: Security and administrative activity trail with sanitized payloads.
- **`login_audits`**: User login attempt records with IP, device, and outcome status.
