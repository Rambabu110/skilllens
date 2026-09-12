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

    class Config:
        from_attributes = True


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


class GenerateQuizRequest(BaseModel):
    document_id: Optional[str] = None
    module_id: Optional[str] = None
    raw_text: Optional[str] = None
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
    quiz_id: str


class AdaptiveAnswerRequest(BaseModel):
    session_id: str
    question_index: int
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

