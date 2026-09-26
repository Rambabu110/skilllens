from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner, Competency, Certificate
from app.schemas.schemas import CertificateOut
from app.services.certificate_service import verify_certificate_by_id, issue_achievement_certificate

router = APIRouter(tags=["certificates"])


@router.get("/verify/certificate/{verification_id}", response_model=CertificateOut)
def verify_certificate(
    verification_id: str,
    db: Session = Depends(get_db),
):
    """
    Public verification endpoint for SkillLens Achievement Certificates.
    No authentication required, allowing third parties to verify credentials.
    """
    result = verify_certificate_by_id(db, verification_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Certificate verification failed: Invalid or expired certificate ID.",
        )
    return result


@router.post("/certificate/issue/{competency_id}", response_model=CertificateOut)
def issue_certificate(
    competency_id: str,
    current: Learner = Depends(get_current_learner),
    db: Session = Depends(get_db),
):
    """
    Issues a verified SkillLens Achievement Certificate for a mastered competency.
    """
    comp = db.query(Competency).get(competency_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competency not found")

    cert = issue_achievement_certificate(
        db=db,
        learner_id=current.id,
        competency_id=comp.id,
    )
    result = verify_certificate_by_id(db, cert.verification_id)
    return result
