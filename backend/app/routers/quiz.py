from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pypdf import PdfReader
import pymupdf
import io
import os
import re

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner, UploadedDocument, Quiz, QuizAttempt, ModuleCompetency, Competency, LearningModule
from app.schemas.schemas import (
    GenerateQuizRequest, QuizOut, SubmitQuizRequest, QuizResultOut,
    AdaptiveStartRequest, AdaptiveAnswerRequest,
)
from app.services.llm import generate_quiz_questions, tag_competencies
from app.services.competency import apply_quiz_result_to_competencies
from app.services.quiz_engine import start_adaptive_session, process_adaptive_answer
from app.core.config import settings

router = APIRouter(prefix="/quiz", tags=["quiz"])


def extract_text_from_pdf(raw: bytes) -> str:
    text = ""
    # 1. PyMuPDF (fitz) - ultra-fast native engine
    try:
        doc = pymupdf.open(stream=raw, filetype="pdf")
        pages = []
        for i, page in enumerate(doc):
            try:
                t = page.get_text()
                if t and t.strip():
                    pages.append(t.strip())
            except Exception:
                pass
            # If the first 5 pages yield no extractable text (e.g. scanned/image PDF), break early
            if i >= 4 and len(pages) == 0:
                break
        if pages:
            text = "\n\n".join(pages)
    except Exception:
        # Fallback to PyPDF only if PyMuPDF completely crashed on open
        try:
            reader = PdfReader(io.BytesIO(raw))
            pages = []
            for page in reader.pages[:5]:
                try:
                    t = page.extract_text()
                    if t and t.strip():
                        pages.append(t.strip())
                except Exception:
                    break
            if pages:
                text = "\n\n".join(pages)
        except Exception:
            pass

    return text


def synthesize_document_curriculum(filename: str) -> str:
    base_name = os.path.splitext(filename)[0]
    clean_title = re.sub(r"[\-_.]+", " ", base_name).strip()

    # Try LLM syllabus generation
    prompt = (
        f"A user uploaded an official learning document titled '{clean_title}'. "
        f"Generate a comprehensive, structured curriculum overview and topic breakdown (200-300 words) "
        f"covering the foundational definitions, core principles, practical rules, and advanced concepts "
        f"typically covered under '{clean_title}'. This will be used as the authoritative curriculum for generating an adaptive skill assessment."
    )
    try:
        from app.services.llm import _call_llm
        syllabus = _call_llm(prompt)
        if syllabus and len(syllabus.strip()) >= 50:
            return f"Curriculum Context: {clean_title}\n\n{syllabus.strip()}"
    except Exception:
        pass

    # Deterministic domain fallback if LLM is unavailable
    clean_lower = clean_title.lower()
    if any(k in clean_lower for k in ["grammar", "english", "language", "communication", "verbal"]):
        return (
            f"Curriculum Syllabus for {clean_title}:\n\n"
            "1. Parts of Speech & Word Classes: Nouns, pronouns, transitive/intransitive verbs, adjectives, adverbs, prepositions, conjunctions, and interjections.\n"
            "2. Verb Tenses & Aspect: Simple, continuous, perfect, and perfect continuous tenses across present, past, and future; auxiliary and modal verbs.\n"
            "3. Syntax & Agreement: Subject-verb agreement, sentence structures (simple, compound, complex), clause analysis, and modifier placement.\n"
            "4. Voice & Speech Transformations: Active to passive voice transformations; direct and indirect reported speech rules.\n"
            "5. Formal Writing & Mechanics: Punctuation, capitalization, official correspondence conventions, vocabulary usage, and error correction."
        )
    elif any(k in clean_lower for k in ["stat", "data", "survey", "sample", "math", "analytic"]):
        return (
            f"Curriculum Syllabus for {clean_title}:\n\n"
            "1. Foundational Statistics: Measures of central tendency (mean, median, mode), dispersion (variance, standard deviation, interquartile range).\n"
            "2. Survey Methodology & Sampling: Simple random sampling, stratified sampling, multi-stage cluster sampling, sample size determination, and design effect.\n"
            "3. Data Quality & Error Management: Sampling vs non-sampling errors, response bias mitigation, imputation techniques, and field validation.\n"
            "4. Statistical Inference & Modeling: Hypothesis testing, p-values, confidence intervals, linear regression, and variance estimation.\n"
            "5. Official Statistical Framework: Administrative registries, census methodologies, metadata standards, and ethical data governance."
        )
    else:
        return (
            f"Curriculum Syllabus for {clean_title}:\n\n"
            f"Comprehensive learning outline and competency benchmark for {clean_title}. "
            "Covers core theoretical foundations, standard terminology, essential workflow procedures, "
            "quality assurance practices, problem-solving methodologies, and statutory compliance guidelines."
        )


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    raw = await file.read()
    text = ""
    is_synthesized = False

    if file.filename.lower().endswith(".pdf"):
        text = extract_text_from_pdf(raw)
    else:
        text = raw.decode("utf-8", errors="ignore")

    if len(text.strip()) < 30:
        # Fallback to intelligent syllabus synthesis so scanned / corrupted stream PDFs work seamlessly
        text = synthesize_document_curriculum(file.filename)
        is_synthesized = True

    doc = UploadedDocument(learner_id=current.id, filename=file.filename, extracted_text=text)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "chars_extracted": len(text),
        "is_synthesized": is_synthesized,
    }


@router.post("/generate", response_model=QuizOut)
def generate_quiz(
    payload: GenerateQuizRequest,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    content = payload.raw_text
    competency_tags = []
    auto_tagged = False

    if payload.document_id:
        doc = db.query(UploadedDocument).get(payload.document_id)
        if not doc or doc.learner_id != current.id:
            raise HTTPException(status_code=404, detail="Document not found")
        content = doc.extracted_text

    if payload.module_id:
        links = db.query(ModuleCompetency).filter(ModuleCompetency.module_id == payload.module_id).all()
        competency_tags = [l.competency_id for l in links]
        if not content:
            mod = db.query(LearningModule).get(payload.module_id)
            if mod:
                content = (
                    f"Learning Module: {mod.title}\n"
                    f"Proficiency Level: Level {mod.level}\n"
                    f"Duration: {mod.duration_minutes} minutes\n"
                    f"Module Description: {mod.description or mod.title}\n"
                    f"Curriculum Assessment: Comprehensive test of concepts, best practices, and practical knowledge in {mod.title}."
                )
    elif content:
        # Advanced feature: zero-shot auto-tag arbitrary uploaded material
        # against the FRAC competency list, so even material with no
        # pre-linked module can feed back into a real competency score.
        all_competencies = db.query(Competency).all()
        name_to_id = {c.name: c.id for c in all_competencies}
        tagged_names = tag_competencies(content, list(name_to_id.keys()))
        competency_tags = [name_to_id[n] for n in tagged_names if n in name_to_id]
        auto_tagged = bool(competency_tags)

    if not content:
        raise HTTPException(status_code=400, detail="Provide module_id, document_id, or raw_text to generate a quiz from.")

    num_to_gen = 10 if (getattr(payload, "mode", "adaptive") == "adaptive") else payload.num_questions
    try:
        questions = generate_quiz_questions(content, n=num_to_gen, language=payload.language)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM quiz generation failed: {e}")

    quiz_title = "Assessment"
    if payload.module_id:
        mod = db.query(LearningModule).get(payload.module_id)
        quiz_title = f"Quiz: {mod.title if mod else payload.module_id}"
    elif payload.document_id:
        doc = db.query(UploadedDocument).get(payload.document_id)
        quiz_title = f"Quiz: {doc.filename if doc else payload.document_id}"
    else:
        quiz_title = "Custom Material Assessment"

    quiz = Quiz(
        title=quiz_title,
        questions=questions,
        competency_tags=competency_tags,
        generated_by=f"{settings.LLM_PROVIDER}" + (" (auto-tagged)" if auto_tagged else ""),
        source_document_id=payload.document_id,
        module_id=payload.module_id,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


@router.post("/adaptive/start")
def start_adaptive_quiz(
    payload: AdaptiveStartRequest,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).get(payload.quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    try:
        return start_adaptive_session(quiz, current.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/adaptive/answer")
def answer_adaptive_question(
    payload: AdaptiveAnswerRequest,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    try:
        return process_adaptive_answer(
            db=db,
            session_id=payload.session_id,
            question_index=payload.question_index,
            selected_option=payload.selected_option,
            current_learner=current,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Adaptive session not found or expired")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/submit", response_model=QuizResultOut)
def submit_quiz(
    payload: SubmitQuizRequest,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).get(payload.quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = quiz.questions
    if len(payload.answers) != len(questions):
        raise HTTPException(status_code=400, detail="Answer count doesn't match question count")

    correct_count = 0
    breakdown = []
    for i, q in enumerate(questions):
        is_correct = payload.answers[i] == q["correct_index"]
        correct_count += int(is_correct)
        breakdown.append({
            "question": q["question"],
            "your_answer": payload.answers[i],
            "correct_answer": q["correct_index"],
            "is_correct": is_correct,
            "explanation": q["explanation"],
            "difficulty": q.get("difficulty", 3),
        })

    score = round((correct_count / len(questions)) * 100, 2)

    attempt = QuizAttempt(learner_id=current.id, quiz_id=quiz.id, answers=payload.answers, score=score)
    db.add(attempt)
    db.commit()

    if quiz.competency_tags:
        apply_quiz_result_to_competencies(db, current, quiz.competency_tags, score)

    return QuizResultOut(score=score, correct_count=correct_count, total=len(questions), breakdown=breakdown)

