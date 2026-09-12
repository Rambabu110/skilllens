from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import is_admin_email
from app.core.database import get_db
from app.core.deps import get_current_learner
from app.core.security import hash_password, verify_password, create_access_token
from app.core.firebase import verify_firebase_id_token
from app.models.models import Learner, Position, LoginAudit
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse, LearnerOut, FirebaseAuthRequest
from app.services.competency import ensure_competency_scores

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=LearnerOut)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Learner).filter(Learner.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_flag = is_admin_email(payload.email)
    learner = Learner(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        position_id=payload.position_id,
        qualification=payload.qualification,
        experience_years=payload.experience_years,
        is_admin=admin_flag,
    )
    db.add(learner)
    db.commit()
    db.refresh(learner)
    return learner


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    learner = db.query(Learner).filter(Learner.email == payload.email).first()
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")

    if not learner or not verify_password(payload.password, learner.hashed_password):
        audit = LoginAudit(
            email=payload.email,
            name=learner.name if learner else None,
            login_method="email_password",
            ip_address=ip_address,
            user_agent=user_agent,
            status="FAILED",
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    learner.last_login_at = datetime.utcnow()
    learner.login_count = (learner.login_count or 0) + 1
    if is_admin_email(learner.email):
        learner.is_admin = True

    audit = LoginAudit(
        learner_id=learner.id,
        email=learner.email,
        name=learner.name,
        login_method="email_password",
        ip_address=ip_address,
        user_agent=user_agent,
        status="SUCCESS",
    )
    db.add(audit)
    db.commit()

    token = create_access_token(subject=learner.email)
    return TokenResponse(access_token=token)


@router.post("/firebase", response_model=TokenResponse)
def firebase_sync(payload: FirebaseAuthRequest, request: Request, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")

    try:
        decoded = verify_firebase_id_token(payload.firebase_id_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase ID token: {e}",
        )

    email = decoded.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase ID token does not contain an email address",
        )

    name = decoded.get("name") or decoded.get("display_name") or email.split("@")[0]
    firebase_uid = decoded.get("uid") or decoded.get("user_id") or f"fb_{email}"
    provider = str(decoded.get("firebase", {}).get("sign_in_provider", ""))
    login_method = "google_oauth" if "google" in provider else "firebase_email"

    # Require email verification so unverified or arbitrary emails cannot access the platform
    email_verified = decoded.get("email_verified")
    is_verified = (email_verified is True) or (str(email_verified).lower() == "true")
    if not is_verified:
        audit = LoginAudit(
            email=email,
            name=name,
            login_method=login_method,
            ip_address=ip_address,
            user_agent=user_agent,
            status="BLOCKED_UNVERIFIED",
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address not verified. Please check your Gmail Inbox and Spam folder to verify your email before logging in.",
        )

    admin_flag = is_admin_email(email)

    learner = db.query(Learner).filter(Learner.email == email).first()
    if not learner:
        pos_id = payload.position_id
        if pos_id:
            pos_match = db.query(Position).filter(Position.id == pos_id).first()
            if not pos_match:
                pos_id = None
        if not pos_id:
            first_pos = db.query(Position).first()
            pos_id = first_pos.id if first_pos else None

        learner = Learner(
            name=name,
            email=email,
            hashed_password=hash_password(firebase_uid),
            position_id=pos_id,
            qualification=payload.qualification or "Graduate",
            experience_years=payload.experience_years or 0.0,
            is_admin=admin_flag,
            last_login_at=datetime.utcnow(),
            login_count=1,
        )
        db.add(learner)
        db.commit()
        db.refresh(learner)

        try:
            ensure_competency_scores(db, learner)
        except Exception:
            pass
    else:
        if name and learner.name == learner.email.split("@")[0]:
            learner.name = name
        if payload.position_id and not learner.position_id:
            pos_match = db.query(Position).filter(Position.id == payload.position_id).first()
            if pos_match:
                learner.position_id = payload.position_id
        if payload.qualification and not learner.qualification:
            learner.qualification = payload.qualification
        if admin_flag and not learner.is_admin:
            learner.is_admin = True
        learner.last_login_at = datetime.utcnow()
        learner.login_count = (learner.login_count or 0) + 1
        db.commit()

    # Record successful login audit in Supabase PostgreSQL
    audit = LoginAudit(
        learner_id=learner.id,
        email=email,
        name=name,
        login_method=login_method,
        ip_address=ip_address,
        user_agent=user_agent,
        status="SUCCESS",
    )
    db.add(audit)
    db.commit()

    token = create_access_token(subject=learner.email)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=LearnerOut)
def me(current: Learner = Depends(get_current_learner)):
    return current
