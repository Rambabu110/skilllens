"""
iGOT-Compatible Integration Adapter (PRD Part 18, 19, 20)

iGOT Karmayogi does not offer a public external developer API.
This router provides an institutional integration adapter contract:
SSO token validation, course catalog lookup, notifications, and FRAC tree hierarchy.
All responses are clearly stamped with adapter metadata:
"source": "prototype_mock_catalog" / "adapter_type": "iGOT-Compatible Integration Adapter"
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Position, Role, Activity, Competency
from app.services.igot_provider import default_igot_provider, IGOTSSOProvider

router = APIRouter(prefix="/mock-igot", tags=["iGOT-Compatible Adapter (Prototype Simulation)"])


@router.post("/sso/validate")
def validate_sso(token: str):
    """
    Simulates institutional iGOT Karmayogi Single Sign-On check.
    Clearly labeled as prototype simulation.
    """
    return IGOTSSOProvider.authenticate_user(token)


@router.get("/catalog")
def get_catalog():
    """
    Retrieves the verified prototype course catalog mapped to official statistical competencies.
    """
    return {
        "adapter_type": "iGOT-Compatible Integration Adapter",
        "provenance": "prototype_mock_catalog",
        "courses": default_igot_provider.get_courses(limit=50),
    }


@router.get("/resources")
def get_resources(competency: str):
    """
    Queries iGOT-compatible course catalog by FRAC competency name.
    """
    matches = default_igot_provider.get_course_competencies(competency)
    return {
        "competency": competency,
        "adapter_type": "iGOT-Compatible Integration Adapter",
        "source": "prototype_mock_catalog",
        "resources": [
            {
                "id": c["course_id"],
                "title": c["title"],
                "duration_minutes": c["duration_minutes"],
                "level": c["level"],
                "provider": c["provider"],
                "url": c["url"],
            }
            for c in matches
        ],
    }


@router.post("/notify")
def notify(learner_id: str, message: str):
    """
    Simulates notification push to iGOT Karmayogi notification center.
    """
    return default_igot_provider.notify(learner_id, message)


@router.get("/frac/{position_id}")
def get_frac_tree(position_id: str, db: Session = Depends(get_db)):
    """
    Simulates official FRAC lookup: Position -> Roles -> Activities -> Competencies.
    Demonstrates true alignment with Mission Karmayogi's institutional architecture.
    """
    position = db.query(Position).get(position_id)
    if not position:
        return {"error": "Position not found in FRAC registry"}

    roles = db.query(Role).filter(Role.position_id == position.id).all()
    tree = {
        "framework": "Mission Karmayogi FRAC Tier-1",
        "position": position.title,
        "department": position.department,
        "roles": [],
    }
    for role in roles:
        activities = db.query(Activity).filter(Activity.role_id == role.id).all()
        role_node = {"role_name": role.role_name, "activities": []}
        for act in activities:
            comps = db.query(Competency).filter(Competency.activity_id == act.id).all()
            role_node["activities"].append({
                "description": act.description,
                "competencies": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "type": c.type.value if hasattr(c.type, "value") else c.type,
                        "required_level": c.required_level,
                    }
                    for c in comps
                ],
            })
        tree["roles"].append(role_node)
    return tree

