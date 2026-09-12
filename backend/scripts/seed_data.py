"""
Phase 1 seed data — structured to mirror the real FRAC methodology
(Position -> Role -> Activity -> Competency, competency typed as
behavioural/functional/domain), scoped to India's Official Statistical
System per the problem statement. This is synthetically authored
(disclosed), not scraped from any real iGOT/DoPT internal system.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal, engine, Base
from app.models.models import (
    Position, Role, Activity, Competency, CompetencyType,
    LearningModule, ModuleCompetency,
)

Base.metadata.create_all(bind=engine)

FRAC_TREE = [
    {
        "position": "Junior Statistical Officer",
        "department": "Ministry of Statistics and Programme Implementation",
        "roles": [
            {
                "role_name": "Data Collection & Field Survey",
                "activities": [
                    {
                        "description": "Design and administer household/enterprise surveys",
                        "competencies": [
                            ("Statistical Sampling Methods", CompetencyType.domain, 4),
                            ("Field Data Collection Protocols", CompetencyType.functional, 3),
                            ("Stakeholder Communication", CompetencyType.behavioural, 3),
                        ],
                    },
                    {
                        "description": "Validate and clean collected field data",
                        "competencies": [
                            ("Data Quality Assurance", CompetencyType.functional, 3),
                            ("Attention to Detail", CompetencyType.behavioural, 3),
                        ],
                    },
                ],
            },
        ],
    },
    {
        "position": "Data Analyst (Statistical System)",
        "department": "National Statistical Office",
        "roles": [
            {
                "role_name": "Statistical Analysis & Reporting",
                "activities": [
                    {
                        "description": "Analyze survey datasets to produce official indicators",
                        "competencies": [
                            ("Statistical Sampling Methods", CompetencyType.domain, 4),
                            ("Data Analysis & Interpretation", CompetencyType.functional, 4),
                            ("Statistical Software Proficiency", CompetencyType.functional, 4),
                        ],
                    },
                    {
                        "description": "Prepare reports for policy stakeholders",
                        "competencies": [
                            ("Report Writing", CompetencyType.functional, 3),
                            ("Policy Communication", CompetencyType.behavioural, 3),
                        ],
                    },
                ],
            },
        ],
    },
    {
        "position": "Survey Supervisor",
        "department": "Ministry of Statistics and Programme Implementation",
        "roles": [
            {
                "role_name": "Field Team Management",
                "activities": [
                    {
                        "description": "Supervise and train field enumerators",
                        "competencies": [
                            ("People Management", CompetencyType.behavioural, 4),
                            ("Training Delivery", CompetencyType.functional, 3),
                            ("Field Data Collection Protocols", CompetencyType.functional, 4),
                        ],
                    },
                    {
                        "description": "Monitor survey progress against targets",
                        "competencies": [
                            ("Project Monitoring", CompetencyType.functional, 3),
                            ("Data Quality Assurance", CompetencyType.functional, 3),
                        ],
                    },
                ],
            },
        ],
    },
    {
        "position": "Research Investigator",
        "department": "National Sample Survey Office",
        "roles": [
            {
                "role_name": "Applied Statistical Research",
                "activities": [
                    {
                        "description": "Design research methodology for socio-economic studies",
                        "competencies": [
                            ("Research Methodology", CompetencyType.domain, 4),
                            ("Statistical Sampling Methods", CompetencyType.domain, 3),
                            ("Statistical Software Proficiency", CompetencyType.functional, 3),
                        ],
                    },
                    {
                        "description": "Present findings to senior officials",
                        "competencies": [
                            ("Report Writing", CompetencyType.functional, 3),
                            ("Policy Communication", CompetencyType.behavioural, 3),
                        ],
                    },
                ],
            },
        ],
    },
]

# Learning module catalog: stand-in for the real iGOT Karmayogi catalog.
# Each module tagged to the competency names it addresses.
MODULE_CATALOG = [
    ("Foundations of Statistical Sampling", "Covers probability, stratified and cluster sampling for official surveys.", 90, 2, ["Statistical Sampling Methods"]),
    ("Advanced Sampling Design", "Multi-stage sampling design for national surveys.", 120, 4, ["Statistical Sampling Methods"]),
    ("Field Survey Protocols & Ethics", "Standard operating procedures for household/enterprise field surveys.", 60, 2, ["Field Data Collection Protocols"]),
    ("Data Quality Assurance in Official Statistics", "Validation, cleaning, and quality frameworks for survey data.", 75, 3, ["Data Quality Assurance"]),
    ("Effective Stakeholder Communication", "Communicating with respondents, local authorities, and field teams.", 45, 2, ["Stakeholder Communication"]),
    ("Statistical Software: R & Python for Analysts", "Hands-on statistical computing for official data analysis.", 150, 3, ["Statistical Software Proficiency", "Data Analysis & Interpretation"]),
    ("Data Analysis & Interpretation for Policy", "Turning raw statistics into policy-relevant indicators.", 100, 3, ["Data Analysis & Interpretation"]),
    ("Report Writing for Government Statisticians", "Structuring official statistical reports for stakeholders.", 60, 2, ["Report Writing"]),
    ("Policy Communication Essentials", "Communicating statistical findings to non-technical policymakers.", 50, 2, ["Policy Communication"]),
    ("People Management for Field Supervisors", "Leading and motivating field enumeration teams.", 90, 3, ["People Management"]),
    ("Training Delivery Skills", "Designing and delivering field-staff training sessions.", 60, 2, ["Training Delivery"]),
    ("Project Monitoring & MIS", "Tracking survey progress using monitoring information systems.", 70, 3, ["Project Monitoring"]),
    ("Research Methodology in Social Statistics", "Designing rigorous socio-economic research studies.", 110, 4, ["Research Methodology"]),
    ("Attention to Detail: Data Integrity Practices", "Micro-habits for error-free field data recording.", 30, 1, ["Attention to Detail"]),
]


def run():
    db = SessionLocal()
    try:
        if db.query(Position).count() > 0:
            print("Seed data already present, skipping.")
            return

        competency_registry = {}  # name -> Competency object (dedupe across activities)

        for pos_data in FRAC_TREE:
            position = Position(title=pos_data["position"], department=pos_data["department"])
            db.add(position)
            db.flush()

            for role_data in pos_data["roles"]:
                role = Role(position_id=position.id, role_name=role_data["role_name"])
                db.add(role)
                db.flush()

                for act_data in role_data["activities"]:
                    activity = Activity(role_id=role.id, description=act_data["description"])
                    db.add(activity)
                    db.flush()

                    for name, ctype, level in act_data["competencies"]:
                        if name in competency_registry:
                            continue  # already created under another activity
                        comp = Competency(
                            activity_id=activity.id, name=name, type=ctype,
                            required_level=level, description=f"{ctype.value.title()} competency: {name}",
                        )
                        db.add(comp)
                        db.flush()
                        competency_registry[name] = comp

        for title, desc, duration, level, comp_names in MODULE_CATALOG:
            module = LearningModule(
                title=title, description=desc, duration_minutes=duration,
                level=level, source="mock_igot",
            )
            db.add(module)
            db.flush()
            for cname in comp_names:
                comp = competency_registry.get(cname)
                if comp:
                    db.add(ModuleCompetency(module_id=module.id, competency_id=comp.id))

        db.commit()
        print(f"Seeded {len(competency_registry)} competencies across {len(FRAC_TREE)} positions "
              f"and {len(MODULE_CATALOG)} learning modules.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
