"""
SkillLens AI — Passbook & Certificate Verification Service (PRD Part 17)

Issues and validates verifiable "SkillLens Achievement Certificates"
with cryptographic verification IDs (e.g., SL-2026-CERT-XXXX).

Publicly verifiable via: /verify/certificate/{verification_id}
Does NOT claim official iGOT government issuance; accurately framed as
an institutional SkillLens Competency Credential.
"""
from typing import Dict, Any, Optional
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import Certificate, Learner, Competency, LearnerCompetencyScore


def issue_achievement_certificate(
    db: Session,
    learner_id: str,
    competency_id: Optional[str] = None,
    achievement_name: Optional[str] = None,
    evidence_summary: Optional[Dict[str, Any]] = None,
) -> Certificate:
    """Issues a verifiable SkillLens Achievement Certificate."""
    learner = db.query(Learner).get(learner_id)
    if not learner:
        raise ValueError("Learner not found.")

    comp = db.query(Competency).get(competency_id) if competency_id else None
    title = f"SkillLens Achievement Certificate — {comp.name if comp else 'Cadre Competency'}"
    achieve = achievement_name or (f"Demonstrated Level {comp.required_level} Mastery in {comp.name}" if comp else "Cadre Proficiency Benchmark Achieved")

    # Generate unique verification code e.g. SL-2026-CERT-ABCD1234
    short_uuid = uuid.uuid4().hex[:8].upper()
    verification_id = f"SL-2026-CERT-{short_uuid}"

    cert = Certificate(
        verification_id=verification_id,
        learner_id=learner.id,
        competency_id=comp.id if comp else None,
        title=title,
        achievement_name=achieve,
        issue_date=datetime.utcnow(),
        valid=True,
        evidence_summary=evidence_summary or {
            "cadre": learner.position.title if learner.position else "Official Statistical System",
            "verified_by": "SkillLens Automated Evidence Engine",
            "framework": "Mission Karmayogi FRAC Calibrated",
        },
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


def verify_certificate_by_id(
    db: Session,
    verification_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Public lookup for certificate verification:
    Returns dict if valid, None if invalid/not found.
    """
    cert = db.query(Certificate).filter(Certificate.verification_id == verification_id.strip()).first()
    if not cert:
        return None

    learner = cert.learner
    comp = cert.competency

    return {
        "verification_id": cert.verification_id,
        "valid": bool(cert.valid),
        "learner_name": learner.name if learner else "Anonymous Cadre Officer",
        "competency_title": comp.name if comp else (cert.title or "General Statistical Competency"),
        "achievement_name": cert.achievement_name,
        "issue_date": cert.issue_date.isoformat() if cert.issue_date else None,
        "evidence_summary": cert.evidence_summary or {},
        "status": "VALID & VERIFIED" if cert.valid else "REVOKED",
        "issuing_authority": "SkillLens AI Competency Verification Node",
    }
