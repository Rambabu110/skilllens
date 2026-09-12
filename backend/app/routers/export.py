from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_learner
from app.models.models import Learner, Position
from app.services.competency import compute_gaps
from app.services.recommend import recommend_for_gaps
from app.services.pdf_export import build_passbook_pdf

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/passbook-pdf")
def export_passbook_pdf(current: Learner = Depends(get_current_learner), db: Session = Depends(get_db)):
    position = db.query(Position).get(current.position_id) if current.position_id else None
    gaps = compute_gaps(db, current)
    recs = recommend_for_gaps(db, gaps)

    pdf_bytes = build_passbook_pdf(current, position, gaps, recs)
    filename = f"competency_passbook_{current.name.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
