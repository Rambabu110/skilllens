from datetime import datetime
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, EmailStr


# --- Auth ---
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    position_id: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: float = 0


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class FirebaseAuthRequest(BaseModel):
    firebase_id_token: str
    position_id: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: float = 0


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LearnerOut(BaseModel):
    id: str
    name: str
    email: str
    position_id: Optional[str]
    qualification: Optional[str]
    experience_years: float
    is_admin: bool = False
    onboarding_completed: bool = False
    career_goal: Optional[str] = None
    goal_timeline_months: Optional[int] = None
    learning_preference: Optional[str] = None

    class Config:
        from_attributes = True


class OnboardingRequest(BaseModel):
    """Payload submitted at the end of the onboarding wizard."""
    position_id: str
    qualification: str
    experience_years: float = 0.0
    career_goal: Optional[str] = None
    goal_timeline_months: Optional[int] = 12
    learning_preference: Optional[str] = "self-paced"  # self-paced | guided | intensive
    # Optional self-assessed competency levels (competency_id -> level 1-5)
    self_assessment: Optional[Dict[str, int]] = None

# --- FRAC / Position ---
class PositionOut(BaseModel):
    id: str
    title: str
    department: str

    class Config:
        from_attributes = True


class CompetencyOut(BaseModel):
    id: str
    name: str
    type: str
    required_level: int
    description: Optional[str]

    class Config:
        from_attributes = True


# --- Competency profile / gaps ---
class CompetencyScoreOut(BaseModel):
    competency_id: str
    competency_name: str
    competency_type: str
    required_level: int
    current_level: float
    confidence: Optional[float]
    mastery_probability: Optional[float] = 0.3


class GapItem(BaseModel):
    competency_id: str
    competency_name: str
    competency_type: str
    required_level: int
    current_level: float
    gap_size: float
    status: str  # "critical" | "developing" | "strength"
    mastery_probability: Optional[float] = 0.3
    gap_type: Optional[str] = "Shallow Gap"
    root_gap_competency: Optional[str] = None
    depth: Optional[int] = 0


# --- Recommendations ---
class ModuleOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    duration_minutes: int
    level: int
    source: str

    class Config:
        from_attributes = True


class RecommendationItem(BaseModel):
    module: ModuleOut
    matched_competency_id: str
    match_type: str  # "rule" | "similarity"
    score: float
    rationale: Optional[str] = None  # LLM-generated, learner-specific explanation


# --- Quiz ---
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str
    difficulty: Any = 3
    topic: Optional[str] = None
    competency: Optional[str] = None
    source_chunk_ids: Optional[List[str]] = None
    source_excerpt: Optional[str] = None
    page_number: Optional[int] = None
    document_name: Optional[str] = None


class GenerateQuizRequest(BaseModel):
    document_id: Optional[str] = None
    module_id: Optional[str] = None
    raw_text: Optional[str] = None
    topic: Optional[str] = None
    num_questions: int = 5
    language: str = "en"  # "en" or "hi"
    mode: Optional[str] = "adaptive"  # "adaptive" (default) or "fixed"


class QuizOut(BaseModel):
    id: str
    title: str
    questions: List[QuizQuestion]
    generated_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class SubmitQuizRequest(BaseModel):
    quiz_id: str
    answers: List[int]


class AdaptiveStartRequest(BaseModel):
    quiz_id: Optional[str] = None
    competency_id: Optional[str] = None
    topic: Optional[str] = None
    language: Optional[str] = "en"
    num_questions: Optional[int] = 5


class AdaptiveAnswerRequest(BaseModel):
    session_id: str
    question_index: Optional[int] = None
    question_id: Optional[str] = None
    selected_option: int


class QuizResultOut(BaseModel):
    score: float
    correct_count: int
    total: int
    breakdown: List[dict]


# --- Voice Viva ---
class VivaStartRequest(BaseModel):
    competency_id: str


class VivaQuestionItem(BaseModel):
    question_en: str
    question_hi: str
    expected_points: List[str]
    max_score: int = 10


class VivaSessionOut(BaseModel):
    session_id: str
    competency_id: str
    competency_name: str
    questions: List[VivaQuestionItem]
    status: str
    scores: Optional[Any] = None


class VivaAnswerResponse(BaseModel):
    question_index: int
    transcript: str
    score: float
    points_covered: List[str]
    points_missed: List[str]
    feedback_en: str
    feedback_hi: str


class VivaFinishOut(BaseModel):
    session_id: str
    competency_id: str
    competency_name: str
    average_score: float
    score_percent: float
    breakdown: List[Dict[str, Any]]
    overall_feedback_en: str
    overall_feedback_hi: str


# --- Topic-Level Mastery ---
class TopicOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    competency_id: str

    class Config:
        from_attributes = True


class LearnerTopicMasteryOut(BaseModel):
    topic_id: str
    topic_name: str
    competency_id: str
    mastery_probability: float
    attempts: int
    correct: int
    confidence: float
    last_assessed: Optional[datetime] = None


# --- Competency Evidence Loop ---
class CompetencyEvidenceOut(BaseModel):
    id: str
    competency_id: str
    competency_name: str
    assessment_type: str
    assessment_id: Optional[str] = None
    score: float
    mastery_probability: Optional[float] = None
    confidence: Optional[float] = None
    source: str
    timestamp: datetime
    before_level: float
    after_level: float
    improvement: float
    evidence_reference: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# --- Reassessment ---
class ReassessmentRequest(BaseModel):
    competency_id: str


class ReassessmentResultOut(BaseModel):
    competency_id: str
    competency_name: str
    before_level: float
    after_level: float
    improvement: float
    gap_status: str  # "Competency Target Achieved" | "Continue Learning"
    target_achieved: bool
    score: float
    evidence_id: str


# --- Dynamic Learning Path ---
class LearningPathStepOut(BaseModel):
    id: str
    learner_id: str
    module_id: str
    competency_id: str
    module_title: str
    module_description: Optional[str] = None
    competency_name: str
    order_index: int
    status: str  # LOCKED, RECOMMENDED, IN_PROGRESS, COMPLETED, REASSESS_REQUIRED, MASTERED
    duration_minutes: int
    level: int
    score: Optional[float] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UpdateStepStatusRequest(BaseModel):
    status: str


# --- Syllabus Watcher & Diff ---
class SyllabusCompareOut(BaseModel):
    v1_title: str
    v2_title: str
    added_topics: List[str]
    removed_topics: List[str]
    modified_topics: List[str]
    unchanged_topics: List[str]
    affected_competencies: List[str]
    affected_questions_count: int


# --- Question Version Control ---
class QuestionVersionOut(BaseModel):
    id: str
    question_id: str
    quiz_id: Optional[str] = None
    version: int
    status: str  # ACTIVE, REVIEW, SUPERSEDED, ARCHIVED
    question_data: Dict[str, Any]
    source_document_id: Optional[str] = None
    created_at: datetime
    superseded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UpdateQuestionStatusRequest(BaseModel):
    status: str


# --- Gamification: Points & Badges ---
class LearnerPointsOut(BaseModel):
    total_points: int
    history: List[Dict[str, Any]]


class BadgeOut(BaseModel):
    id: str
    code: str
    name: str
    description: str
    icon: str
    min_points: int
    awarded: bool = False
    awarded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Notification Center ---
class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    message: str
    read: bool
    created_at: datetime
    related_competency: Optional[str] = None
    related_module: Optional[str] = None

    class Config:
        from_attributes = True


# --- Unified Audit Trail ---
class AuditEventOut(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_type: str
    event_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# --- Certificate Public Verification ---
class CertificateOut(BaseModel):
    verification_id: str
    learner_name: str
    competency_title: str
    achievement_name: str
    issue_date: datetime
    valid: bool
    evidence_summary: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


