"""
FRAC-aligned schema:
Position -> Role -> Activity -> Competency
(mirrors Mission Karmayogi's real Framework of Roles, Activities and
Competencies, so this isn't a generic "skills" table.)
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, ForeignKey, DateTime, Enum, Text, JSON, Boolean
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class CompetencyType(str, enum.Enum):
    behavioural = "behavioural"
    functional = "functional"
    domain = "domain"


class Position(Base):
    __tablename__ = "positions"
    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)          # e.g. "Junior Statistical Officer"
    department = Column(String, nullable=False)

    roles = relationship("Role", back_populates="position", cascade="all, delete-orphan")
    learners = relationship("Learner", back_populates="position")


class Role(Base):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, default=gen_id)
    position_id = Column(String, ForeignKey("positions.id"), nullable=False)
    role_name = Column(String, nullable=False)       # e.g. "Data Collection & Field Survey"

    position = relationship("Position", back_populates="roles")
    activities = relationship("Activity", back_populates="role", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"
    id = Column(String, primary_key=True, default=gen_id)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    description = Column(String, nullable=False)     # e.g. "Design and administer household surveys"

    role = relationship("Role", back_populates="activities")
    competencies = relationship("Competency", back_populates="activity", cascade="all, delete-orphan")


class Competency(Base):
    __tablename__ = "competencies"
    id = Column(String, primary_key=True, default=gen_id)
    activity_id = Column(String, ForeignKey("activities.id"), nullable=False)
    name = Column(String, nullable=False)            # e.g. "Statistical Sampling Methods"
    type = Column(Enum(CompetencyType), nullable=False)
    required_level = Column(Integer, nullable=False)  # 1-5, FRAC-style proficiency level
    description = Column(Text, nullable=True)

    activity = relationship("Activity", back_populates="competencies")
    module_links = relationship("ModuleCompetency", back_populates="competency")
    learner_scores = relationship("LearnerCompetencyScore", back_populates="competency")
    topics = relationship("Topic", back_populates="competency", cascade="all, delete-orphan")
    evidence = relationship("CompetencyEvidence", back_populates="competency", cascade="all, delete-orphan")


class Learner(Base):
    __tablename__ = "learners"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    position_id = Column(String, ForeignKey("positions.id"), nullable=True)
    qualification = Column(String, nullable=True)
    experience_years = Column(Float, default=0)
    joining_date = Column(DateTime, default=datetime.utcnow)
    is_admin = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)

    # Onboarding wizard state — set to True after the learner completes setup
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    # Career development goal free-text (set during onboarding step 4)
    career_goal = Column(Text, nullable=True)
    # Target timeline in months for achieving role readiness
    goal_timeline_months = Column(Integer, nullable=True)
    # Preferred learning format (self-paced, guided, intensive)
    learning_preference = Column(String, nullable=True)

    # Optional link to an OULAD synthetic "behavioral twin" used to seed
    # the ML-derived competency scores for this learner (see ml/README).
    oulad_student_id = Column(String, nullable=True)
    # Real OULAD feature vector (total_clicks, engagement_index, etc.)
    # sampled for this learner so the actual trained model + SHAP
    # explainer can run on them, instead of the heuristic fallback.
    behavioral_features = Column(JSON, nullable=True)

    position = relationship("Position", back_populates="learners")
    scores = relationship("LearnerCompetencyScore", back_populates="learner", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="learner", cascade="all, delete-orphan")
    login_audits = relationship("LoginAudit", back_populates="learner", cascade="all, delete-orphan")
    topic_mastery = relationship("LearnerTopicMastery", back_populates="learner", cascade="all, delete-orphan")
    evidence = relationship("CompetencyEvidence", back_populates="learner", cascade="all, delete-orphan")
    learning_path_steps = relationship("LearningPathStep", back_populates="learner", cascade="all, delete-orphan")
    points = relationship("LearnerPoint", back_populates="learner", cascade="all, delete-orphan")
    badges = relationship("LearnerBadge", back_populates="learner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="learner", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="learner", cascade="all, delete-orphan")


class LoginAudit(Base):
    __tablename__ = "login_audits"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="SET NULL"), nullable=True)
    email = Column(String, nullable=False, index=True)
    name = Column(String, nullable=True)
    login_method = Column(String, nullable=False, default="firebase")  # google_oauth, email_password, firebase
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    status = Column(String, nullable=False, default="SUCCESS")  # SUCCESS, FAILED, BLOCKED_UNVERIFIED
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    learner = relationship("Learner", back_populates="login_audits")


class LearnerCompetencyScore(Base):
    __tablename__ = "learner_competency_scores"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(String, ForeignKey("competencies.id"), nullable=False)
    current_level = Column(Float, nullable=False, default=0)  # 0-5 continuous, from ML model
    mastery_probability = Column(Float, default=0.3, nullable=True)  # BKT probability of mastery
    ability_theta = Column(Float, default=0.0, nullable=True)  # CAT ability estimate
    questions_asked = Column(Integer, default=0, nullable=True)  # Total questions answered
    confidence = Column(Float, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    learner = relationship("Learner", back_populates="scores")
    competency = relationship("Competency", back_populates="learner_scores")


class LearningModule(Base):
    """Stand-in for an iGOT Karmayogi catalog entry."""
    __tablename__ = "learning_modules"
    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=60)
    level = Column(Integer, default=1)  # 1-5
    source = Column(String, default="prototype_mock_catalog")  # marks provenance honestly

    competency_links = relationship("ModuleCompetency", back_populates="module")


class ModuleCompetency(Base):
    """Many-to-many: which competencies a module addresses."""
    __tablename__ = "module_competencies"
    id = Column(String, primary_key=True, default=gen_id)
    module_id = Column(String, ForeignKey("learning_modules.id"), nullable=False)
    competency_id = Column(String, ForeignKey("competencies.id"), nullable=False)

    module = relationship("LearningModule", back_populates="competency_links")
    competency = relationship("Competency", back_populates="module_links")


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id"), nullable=False)
    filename = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(String, primary_key=True, default=gen_id)
    source_document_id = Column(String, ForeignKey("uploaded_documents.id"), nullable=True)
    module_id = Column(String, ForeignKey("learning_modules.id"), nullable=True)
    title = Column(String, nullable=False)
    questions = Column(JSON, nullable=False)  # list of {question, options[4], correct_index, explanation, difficulty, source_chunk_ids, source_excerpt}
    competency_tags = Column(JSON, nullable=True)  # list of competency_id this quiz targets
    generated_by = Column(String, default="gemini")  # honesty field: which LLM actually generated it
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(String, ForeignKey("quizzes.id"), nullable=False)
    answers = Column(JSON, nullable=False)  # list of selected indices
    score = Column(Float, nullable=False)   # 0-100
    submitted_at = Column(DateTime, default=datetime.utcnow)

    learner = relationship("Learner", back_populates="quiz_attempts")


class VivaSession(Base):
    """Voice Viva (AI Oral Examination) session."""
    __tablename__ = "viva_sessions"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(String, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    questions = Column(JSON, nullable=True)  # list of 3 questions with question_en, question_hi, expected_points, max_score
    scores = Column(JSON, nullable=True)     # transcript, rubric score, points_covered, points_missed per question
    status = Column(String, default="in_progress")  # "in_progress" | "complete"
    created_at = Column(DateTime, default=datetime.utcnow)

    learner = relationship("Learner")
    competency = relationship("Competency")


class CompetencyPrereq(Base):
    """Prerequisite Knowledge Graph edge: prereq_competency precedes competency."""
    __tablename__ = "competency_prereqs"
    id = Column(String, primary_key=True, default=gen_id)
    competency_id = Column(String, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    prereq_competency_id = Column(String, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    confidence = Column(Float, default=0.7)
    created_at = Column(DateTime, default=datetime.utcnow)

    competency = relationship("Competency", foreign_keys=[competency_id])
    prereq_competency = relationship("Competency", foreign_keys=[prereq_competency_id])


# --- Topic-Level Mastery ---
class Topic(Base):
    __tablename__ = "topics"
    id = Column(String, primary_key=True, default=gen_id)
    competency_id = Column(String, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    competency = relationship("Competency", back_populates="topics")
    learner_mastery = relationship("LearnerTopicMastery", back_populates="topic", cascade="all, delete-orphan")


class LearnerTopicMastery(Base):
    __tablename__ = "learner_topic_mastery"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(String, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    mastery_probability = Column(Float, default=0.3)
    attempts = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    confidence = Column(Float, default=0.5)
    last_assessed = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    learner = relationship("Learner", back_populates="topic_mastery")
    topic = relationship("Topic", back_populates="learner_mastery")


# --- Competency Evidence Loop ---
class CompetencyEvidence(Base):
    __tablename__ = "competency_evidence"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(String, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    assessment_type = Column(String, nullable=False)  # MCQ, CAT, VIVA, PRACTICAL, REASSESSMENT
    assessment_id = Column(String, nullable=True)
    score = Column(Float, nullable=False)
    mastery_probability = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    source = Column(String, default="skilllens_assessment")
    timestamp = Column(DateTime, default=datetime.utcnow)
    before_level = Column(Float, nullable=False)
    after_level = Column(Float, nullable=False)
    evidence_reference = Column(JSON, nullable=True)

    learner = relationship("Learner", back_populates="evidence")
    competency = relationship("Competency", back_populates="evidence")


# --- True RAG Document Chunks ---
class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(String, primary_key=True, default=gen_id)
    document_id = Column(String, ForeignKey("uploaded_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1)
    text = Column(Text, nullable=False)
    section = Column(String, nullable=True)
    heading = Column(String, nullable=True)
    token_count = Column(Integer, default=0)
    chunk_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("UploadedDocument", back_populates="chunks")


# --- Dynamic Learning Path ---
class LearningPathStep(Base):
    __tablename__ = "learning_path_steps"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(String, ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(String, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False)
    status = Column(String, default="RECOMMENDED")  # LOCKED, RECOMMENDED, IN_PROGRESS, COMPLETED, REASSESS_REQUIRED, MASTERED
    score = Column(Float, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    learner = relationship("Learner", back_populates="learning_path_steps")
    module = relationship("LearningModule")
    competency = relationship("Competency")


# --- Syllabus Version Watcher ---
class SyllabusVersion(Base):
    __tablename__ = "syllabus_versions"
    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    version = Column(String, nullable=False)
    raw_text = Column(Text, nullable=True)
    parsed_structure = Column(JSON, nullable=False)
    diff_summary = Column(JSON, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


# --- Question Version Control ---
class QuestionVersion(Base):
    __tablename__ = "question_versions"
    id = Column(String, primary_key=True, default=gen_id)
    question_id = Column(String, nullable=False, index=True)
    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True)
    version = Column(Integer, default=1)
    status = Column(String, default="ACTIVE")  # ACTIVE, REVIEW, SUPERSEDED, ARCHIVED
    question_data = Column(JSON, nullable=False)
    source_document_id = Column(String, ForeignKey("uploaded_documents.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    superseded_at = Column(DateTime, nullable=True)


# --- Gamification: Points & Badges ---
class LearnerPoint(Base):
    __tablename__ = "learner_points"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String, nullable=False)
    points = Column(Integer, nullable=False)
    idempotent_key = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    learner = relationship("Learner", back_populates="points")


class Badge(Base):
    __tablename__ = "badges"
    id = Column(String, primary_key=True, default=gen_id)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    icon = Column(String, default="award")
    min_points = Column(Integer, default=0)
    criteria = Column(String, nullable=True)


class LearnerBadge(Base):
    __tablename__ = "learner_badges"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    badge_id = Column(String, ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow)
    idempotent_key = Column(String, unique=True, nullable=False, index=True)

    learner = relationship("Learner", back_populates="badges")
    badge = relationship("Badge")


# --- Passbook & Certificate Verification ---
class Certificate(Base):
    __tablename__ = "certificates"
    id = Column(String, primary_key=True, default=gen_id)
    verification_id = Column(String, unique=True, nullable=False, index=True)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(String, ForeignKey("competencies.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)  # SkillLens Achievement Certificate
    achievement_name = Column(String, nullable=False)
    issue_date = Column(DateTime, default=datetime.utcnow)
    valid = Column(Boolean, default=True)
    evidence_summary = Column(JSON, nullable=True)

    learner = relationship("Learner", back_populates="certificates")
    competency = relationship("Competency")


# --- Notification Center ---
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=gen_id)
    learner_id = Column(String, ForeignKey("learners.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    related_competency = Column(String, nullable=True)
    related_module = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    learner = relationship("Learner", back_populates="notifications")


# --- Unified Audit Trail ---
class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(String, primary_key=True, default=gen_id)
    actor_id = Column(String, nullable=True)
    actor_type = Column(String, default="learner")
    event_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)



