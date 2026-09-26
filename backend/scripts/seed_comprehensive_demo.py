"""
SkillLens AI — Comprehensive Deterministic Demo Seeder (PRD Part 24)

Seeds complete, realistic, clearly-labeled DEMO data:
1. FRAC hierarchy: Positions, Roles, Activities, Competencies, Learning Modules
2. Prerequisite knowledge graph (DAG)
3. Topics under competencies
4. Milestone Badges
5. Demo learners (Junior Statistical Officer, Data Analyst, Survey Supervisor, Admin)
6. Realistic competency scores, BKT mastery, and critical gaps
7. Topic-level mastery records
8. Immutable competency evidence records (MCQ, Viva, Reassessment)
9. Dynamic learning path steps
10. Gamification points and unlocked badges
11. Internal notifications
12. Security and operational audit events
13. Verifiable SkillLens Achievement Certificate
14. Initial Syllabus versions for the Syllabus Pattern Watcher

All records are marked or documented as DEMO DATA.
"""
import os
import sys
import uuid
from datetime import datetime, timedelta

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.models import (
    Position, Role, Activity, Competency, CompetencyType,
    LearningModule, ModuleCompetency, CompetencyPrereq,
    Topic, LearnerTopicMastery,
    Badge, LearnerBadge, LearnerPoint,
    Learner, LearnerCompetencyScore,
    CompetencyEvidence, LearningPathStep,
    Notification, AuditEvent, Certificate,
    SyllabusVersion, QuestionVersion, Quiz,
)
from app.services.gamification_service import DEFAULT_BADGES

# Ensure all tables are created
Base.metadata.create_all(bind=engine)


def seed_all():
    db = SessionLocal()
    try:
        print("[Demo Seed] Seeding FRAC Competency Framework...")
        # 1. Base FRAC Tree
        from scripts.seed_data import FRAC_TREE, MODULE_CATALOG
        
        comp_registry = {}
        for pos_data in FRAC_TREE:
            pos = db.query(Position).filter(Position.title == pos_data["position"]).first()
            if not pos:
                pos = Position(title=pos_data["position"], department=pos_data["department"])
                db.add(pos)
                db.flush()

            for role_data in pos_data["roles"]:
                role = db.query(Role).filter(Role.position_id == pos.id, Role.role_name == role_data["role_name"]).first()
                if not role:
                    role = Role(position_id=pos.id, role_name=role_data["role_name"])
                    db.add(role)
                    db.flush()

                for act_data in role_data["activities"]:
                    act = db.query(Activity).filter(Activity.role_id == role.id, Activity.description == act_data["description"]).first()
                    if not act:
                        act = Activity(role_id=role.id, description=act_data["description"])
                        db.add(act)
                        db.flush()

                    for name, ctype, level in act_data["competencies"]:
                        comp = db.query(Competency).filter(Competency.name == name).first()
                        if not comp:
                            comp = Competency(
                                activity_id=act.id,
                                name=name,
                                type=ctype,
                                required_level=level,
                                description=f"{ctype.value.title()} competency: {name} under Mission Karmayogi FRAC framework.",
                            )
                            db.add(comp)
                            db.flush()
                        comp_registry[name] = comp

        # Learning Modules
        for title, desc, duration, level, comp_names in MODULE_CATALOG:
            mod = db.query(LearningModule).filter(LearningModule.title == title).first()
            if not mod:
                mod = LearningModule(
                    title=title, description=desc, duration_minutes=duration,
                    level=level, source="mock_igot",
                )
                db.add(mod)
                db.flush()
                for cname in comp_names:
                    c = comp_registry.get(cname)
                    if c:
                        db.add(ModuleCompetency(module_id=mod.id, competency_id=c.id))

        db.commit()

        # 2. Prerequisite DAG
        print("[Demo Seed] Seeding Prerequisite DAG edges...")
        from scripts.build_prereq_graph import DOMAIN_PREREQ_HEURISTICS
        for prereq_name, target_name in DOMAIN_PREREQ_HEURISTICS:
            p_comp = db.query(Competency).filter(Competency.name == prereq_name).first()
            t_comp = db.query(Competency).filter(Competency.name == target_name).first()
            if p_comp and t_comp:
                existing_edge = db.query(CompetencyPrereq).filter(
                    CompetencyPrereq.competency_id == t_comp.id,
                    CompetencyPrereq.prereq_competency_id == p_comp.id,
                ).first()
                if not existing_edge:
                    db.add(CompetencyPrereq(
                        competency_id=t_comp.id,
                        prereq_competency_id=p_comp.id,
                        confidence=0.92,
                    ))
        db.commit()

        # 3. Topics under Competencies
        print("[Demo Seed] Seeding Topics under Competencies...")
        TOPIC_MAP = {
            "Statistical Sampling Methods": [
                ("Simple Random Sampling", "Equal probability sample selection methods and formulas."),
                ("Stratified Sampling", "Proportional and optimum allocation across administrative strata."),
                ("Cluster & Multi-Stage Sampling", "Primary sampling units (PSU) and ultimate sampling units."),
                ("Sampling Error & Bias", "Standard error estimation and non-sampling bias mitigation."),
            ],
            "Field Data Collection Protocols": [
                ("Household Survey Schedules", "Standard operating procedures for administering survey questionnaires."),
                ("Interviewing Protocols", "Neutral prompting and consent gathering standards."),
                ("GPS & Geo-tagging Verification", "Validating geographic coverage of enumerator routes."),
            ],
            "Data Quality Assurance": [
                ("Range & Consistency Checks", "Logical verification and validation rules for collected fields."),
                ("Outlier Detection Methods", "Identifying anomalies in numerical indicator reports."),
                ("Missing Data Imputation", "Standard imputation practices in official statistics."),
            ],
            "Data Analysis & Interpretation": [
                ("Descriptive Statistics & Aggregation", "Computing central tendencies, variances, and weighted totals."),
                ("Index Number Formulation", "Consumer price and industrial production index calculation."),
                ("Cross-Tabulation & Trend Analysis", "Multi-dimensional demographic analysis."),
            ],
            "Statistical Software Proficiency": [
                ("R for Survey Processing", "Using survey and tidyverse packages for microdata."),
                ("Python for Data Cleaning", "Pandas pipelines for cleaning large-scale survey extracts."),
            ],
            "Stakeholder Communication": [
                ("Field Respondent Engagement", "Overcoming non-response bias through clear communication."),
                ("District Administration Briefing", "Presenting field survey schedules to local magistrates."),
            ],
            "Attention to Detail": [
                ("Form Audit Verification", "Pre-submission checklist verification on mobile devices."),
            ],
        }

        topic_registry = {}
        for comp_name, topics in TOPIC_MAP.items():
            comp = db.query(Competency).filter(Competency.name == comp_name).first()
            if not comp:
                continue
            for t_name, t_desc in topics:
                existing_topic = db.query(Topic).filter(Topic.name == t_name, Topic.competency_id == comp.id).first()
                if not existing_topic:
                    t = Topic(
                        name=t_name,
                        description=t_desc,
                        competency_id=comp.id,
                    )
                    db.add(t)
                    db.flush()
                    topic_registry[t_name] = t
                else:
                    topic_registry[t_name] = existing_topic
        db.commit()

        # 4. Standard Badges
        print("[Demo Seed] Seeding Milestone Badges...")
        for b in DEFAULT_BADGES:
            existing_badge = db.query(Badge).filter(Badge.code == b["code"]).first()
            if not existing_badge:
                db.add(Badge(
                    code=b["code"],
                    name=b["name"],
                    description=b["description"],
                    icon=b["icon"],
                    min_points=b["min_points"],
                ))
        db.commit()

        # 5. Demo Learners
        print("[Demo Seed] Seeding Demo Learners...")
        jso_pos = db.query(Position).filter(Position.title == "Junior Statistical Officer").first()
        da_pos = db.query(Position).filter(Position.title == "Data Analyst (Statistical System)").first()
        ss_pos = db.query(Position).filter(Position.title == "Survey Supervisor").first()

        # Aditi Sharma - Junior Statistical Officer (Primary Demo Learner)
        aditi = db.query(Learner).filter(Learner.email == "aditi.demo@skilllens.in").first()
        if not aditi:
            aditi = Learner(
                name="Aditi Sharma",
                email="aditi.demo@skilllens.in",
                hashed_password=hash_password("demo1234"),
                position_id=jso_pos.id if jso_pos else None,
                qualification="Bachelors in Statistics",
                experience_years=1.5,
                is_admin=False,
                onboarding_completed=True,
                career_goal="I want to lead national survey design and master statistical sampling methods.",
                goal_timeline_months=12,
                learning_preference="guided",
                login_count=4,
                last_login_at=datetime.utcnow() - timedelta(hours=2),
            )
            db.add(aditi)
            db.flush()
        else:
            aditi.position_id = jso_pos.id if jso_pos else None
            aditi.hashed_password = hash_password("demo1234")
            aditi.onboarding_completed = True
            db.flush()

        # Rohan Verma - Data Analyst
        rohan = db.query(Learner).filter(Learner.email == "rohan.demo@skilllens.in").first()
        if not rohan:
            rohan = Learner(
                name="Rohan Verma",
                email="rohan.demo@skilllens.in",
                hashed_password=hash_password("demo1234"),
                position_id=da_pos.id if da_pos else None,
                qualification="Masters in Data Science",
                experience_years=4.0,
                is_admin=False,
                onboarding_completed=True,
                career_goal="Become a data science lead at NSO within 18 months.",
                goal_timeline_months=18,
                learning_preference="intensive",
                login_count=12,
                last_login_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(rohan)

        # Kavita Nair - Survey Supervisor
        kavita = db.query(Learner).filter(Learner.email == "kavita.demo@skilllens.in").first()
        if not kavita:
            kavita = Learner(
                name="Kavita Nair",
                email="kavita.demo@skilllens.in",
                hashed_password=hash_password("demo1234"),
                position_id=ss_pos.id if ss_pos else None,
                qualification="Bachelors in Economics",
                experience_years=7.0,
                is_admin=False,
                onboarding_completed=True,
                career_goal="Master field quality protocols and achieve Survey Supervisor certification.",
                goal_timeline_months=6,
                learning_preference="self-paced",
                login_count=25,
                last_login_at=datetime.utcnow() - timedelta(days=2),
            )
            db.add(kavita)

        # Training Administrator
        admin = db.query(Learner).filter(Learner.email == "admin.demo@skilllens.in").first()
        if not admin:
            admin = Learner(
                name="Training Administrator (Directorate of Training)",
                email="admin.demo@skilllens.in",
                hashed_password=hash_password("admin1234"),
                is_admin=True,
                onboarding_completed=True,
                login_count=40,
                last_login_at=datetime.utcnow() - timedelta(minutes=15),
            )
            db.add(admin)

        db.commit()

        # 6. Realistic Competency Scores for Aditi Sharma
        print("[Demo Seed] Seeding Aditi Sharma's Competency Scores & Evidence...")
        aditi_scores_data = [
            ("Statistical Sampling Methods", 1.8, 0.35, 0.70),    # req 4.0 -> Critical gap (2.2)
            ("Field Data Collection Protocols", 2.8, 0.65, 0.85),# req 3.0 -> Developing gap (0.2)
            ("Data Quality Assurance", 2.0, 0.42, 0.68),         # req 3.0 -> Developing gap (1.0)
            ("Stakeholder Communication", 3.2, 0.80, 0.90),      # req 3.0 -> Strength (+0.2)
            ("Attention to Detail", 3.1, 0.78, 0.88),            # req 3.0 -> Strength (+0.1)
        ]


        for comp_name, cur_lvl, mastery, conf in aditi_scores_data:
            comp = db.query(Competency).filter(Competency.name == comp_name).first()
            if not comp:
                continue
            score_row = db.query(LearnerCompetencyScore).filter(
                LearnerCompetencyScore.learner_id == aditi.id,
                LearnerCompetencyScore.competency_id == comp.id,
            ).first()
            if not score_row:
                score_row = LearnerCompetencyScore(
                    learner_id=aditi.id,
                    competency_id=comp.id,
                    current_level=cur_lvl,
                    mastery_probability=mastery,
                    confidence=conf,
                    last_updated=datetime.utcnow() - timedelta(days=1),
                )
                db.add(score_row)
            else:
                score_row.current_level = cur_lvl
                score_row.mastery_probability = mastery
                score_row.confidence = conf
                score_row.last_updated = datetime.utcnow() - timedelta(days=1)
        db.commit()

        # 7. Topic-level Mastery for Aditi Sharma
        print("[Demo Seed] Seeding Topic-level Mastery for Aditi Sharma...")
        topic_mastery_data = [
            ("Simple Random Sampling", 0.50, 4, 2),
            ("Stratified Sampling", 0.35, 3, 1),
            ("Cluster & Multi-Stage Sampling", 0.25, 4, 1),
            ("Sampling Error & Bias", 0.20, 2, 0),
            ("Household Survey Schedules", 0.75, 5, 4),
            ("Range & Consistency Checks", 0.45, 4, 2),
            ("Field Respondent Engagement", 0.85, 4, 4),
        ]

        for t_name, p_mastery, atts, corr in topic_mastery_data:
            t = topic_registry.get(t_name)
            if not t:
                continue
            existing_tm = db.query(LearnerTopicMastery).filter(
                LearnerTopicMastery.learner_id == aditi.id,
                LearnerTopicMastery.topic_id == t.id,
            ).first()
            if not existing_tm:
                db.add(LearnerTopicMastery(
                    learner_id=aditi.id,
                    topic_id=t.id,
                    mastery_probability=p_mastery,
                    attempts=atts,
                    correct=corr,
                    last_assessed=datetime.utcnow() - timedelta(days=2),
                ))
        db.commit()

        # 8. Competency Evidence for Aditi Sharma
        print("[Demo Seed] Seeding Immutable Competency Evidence...")
        sampling_comp = db.query(Competency).filter(Competency.name == "Statistical Sampling Methods").first()
        field_comp = db.query(Competency).filter(Competency.name == "Field Data Collection Protocols").first()
        quality_comp = db.query(Competency).filter(Competency.name == "Data Quality Assurance").first()

        evidence_records = [
            (
                sampling_comp.id if sampling_comp else None,
                "MCQ",
                "attempt_demo_01",
                55.0,
                2.0,
                2.2,
                0.40,
                0.70,
                {"quiz_title": "Field Sampling Diagnostics", "items_tested": 10, "correct": 5},
                datetime.utcnow() - timedelta(days=3),
            ),
            (
                field_comp.id if field_comp else None,
                "VIVA",
                "viva_demo_01",
                78.0,
                2.5,
                2.8,
                0.65,
                0.85,
                {"transcript_summary": "Demonstrated solid grasp of field respondent consent and survey schedule administration."},
                datetime.utcnow() - timedelta(days=2),
            ),
            (
                quality_comp.id if quality_comp else None,
                "CAT",
                "cat_demo_01",
                60.0,
                1.8,
                2.1,
                0.42,
                0.68,
                {"stopping_criterion": "standard_error_target_reached", "ability_theta": -0.45},
                datetime.utcnow() - timedelta(days=1),
            ),
        ]

        for cid, atype, aid, sc, blvl, alvl, mprob, conf, ref, tstamp in evidence_records:
            if not cid:
                continue
            existing_ev = db.query(CompetencyEvidence).filter(
                CompetencyEvidence.learner_id == aditi.id,
                CompetencyEvidence.assessment_id == aid,
            ).first()
            if not existing_ev:
                db.add(CompetencyEvidence(
                    learner_id=aditi.id,
                    competency_id=cid,
                    assessment_type=atype,
                    assessment_id=aid,
                    score=sc,
                    before_level=blvl,
                    after_level=alvl,
                    mastery_probability=mprob,
                    confidence=conf,
                    evidence_reference=ref,
                    source="skilllens_assessment_engine",
                    timestamp=tstamp,
                ))
        db.commit()

        # 9. Dynamic Learning Path Steps for Aditi Sharma
        print("[Demo Seed] Seeding Dynamic Learning Path Steps...")
        mod_foundations = db.query(LearningModule).filter(LearningModule.title == "Foundations of Statistical Sampling").first()
        mod_advanced = db.query(LearningModule).filter(LearningModule.title == "Advanced Sampling Design").first()
        mod_quality = db.query(LearningModule).filter(LearningModule.title == "Data Quality Assurance in Official Statistics").first()

        path_steps = [
            (
                mod_foundations.id if mod_foundations else None,
                sampling_comp.id if sampling_comp else None,
                1,
                "RECOMMENDED",
                None,
                None,
            ),
            (
                mod_advanced.id if mod_advanced else None,
                sampling_comp.id if sampling_comp else None,
                2,
                "LOCKED",
                None,
                None,
            ),
            (
                mod_quality.id if mod_quality else None,
                quality_comp.id if quality_comp else None,
                3,
                "LOCKED",
                None,
                None,
            ),
        ]

        for mid, cid, idx, status, sc, comp_time in path_steps:
            if not mid or not cid:
                continue
            existing_step = db.query(LearningPathStep).filter(
                LearningPathStep.learner_id == aditi.id,
                LearningPathStep.module_id == mid,
            ).first()
            if not existing_step:
                db.add(LearningPathStep(
                    learner_id=aditi.id,
                    module_id=mid,
                    competency_id=cid,
                    order_index=idx,
                    status=status,
                    score=sc,
                    completed_at=comp_time,
                    created_at=datetime.utcnow() - timedelta(days=2),
                ))
        db.commit()

        # 10. Gamification Points and Badges for Aditi Sharma
        print("[Demo Seed] Seeding Gamification Points and Badges...")
        p1 = db.query(LearnerPoint).filter(LearnerPoint.learner_id == aditi.id, LearnerPoint.event_type == "QUIZ_COMPLETED").first()
        if not p1:
            db.add(LearnerPoint(
                learner_id=aditi.id,
                event_type="QUIZ_COMPLETED",
                points=10,
                idempotent_key=f"{aditi.id}_QUIZ_COMPLETED_seed1",
                description="Completed diagnostic assessment: Field Sampling Diagnostics",
                created_at=datetime.utcnow() - timedelta(days=3),
            ))
        p2 = db.query(LearnerPoint).filter(LearnerPoint.learner_id == aditi.id, LearnerPoint.event_type == "VIVA_COMPLETED").first()
        if not p2:
            db.add(LearnerPoint(
                learner_id=aditi.id,
                event_type="VIVA_COMPLETED",
                points=15,
                idempotent_key=f"{aditi.id}_VIVA_COMPLETED_seed1",
                description="Completed AI Viva on Field Data Collection Protocols",
                created_at=datetime.utcnow() - timedelta(days=2),
            ))
        p3 = db.query(LearnerPoint).filter(LearnerPoint.learner_id == aditi.id, LearnerPoint.event_type == "ASSESSMENT_IMPROVED").first()
        if not p3:
            db.add(LearnerPoint(
                learner_id=aditi.id,
                event_type="ASSESSMENT_IMPROVED",
                points=20,
                idempotent_key=f"{aditi.id}_ASSESSMENT_IMPROVED_seed1",
                description="Demonstrated measurable progress in Field Survey Protocols (+0.3)",
                created_at=datetime.utcnow() - timedelta(days=1),
            ))

        first_badge = db.query(Badge).filter(Badge.code == "FIRST_ASSESSMENT").first()
        if first_badge:
            existing_lb = db.query(LearnerBadge).filter(
                LearnerBadge.learner_id == aditi.id,
                LearnerBadge.badge_id == first_badge.id,
            ).first()
            if not existing_lb:
                db.add(LearnerBadge(
                    learner_id=aditi.id,
                    badge_id=first_badge.id,
                    idempotent_key=f"{aditi.id}_{first_badge.code}",
                    awarded_at=datetime.utcnow() - timedelta(days=3),
                ))
        db.commit()

        # 11. Notifications for Aditi Sharma
        print("[Demo Seed] Seeding Notifications...")
        notifs = [
            (
                "GAP_DETECTED",
                "Critical Cadre Deficit Identified",
                "Your baseline assessment indicates a -1.8 gap in 'Statistical Sampling Methods' against the required Level 4.0 benchmark.",
                sampling_comp.id if sampling_comp else None,
            ),
            (
                "NEW_RECOMMENDATION",
                "Targeted Learning Pathway Prepared",
                "Module 'Foundations of Statistical Sampling' addresses the upstream prerequisite root cause of your sampling deficit.",
                sampling_comp.id if sampling_comp else None,
            ),
            (
                "REASSESSMENT_AVAILABLE",
                "Reassessment Available for Verification",
                "Complete module exercises to unlock official competency reassessment and update your SkillLens Passbook.",
                sampling_comp.id if sampling_comp else None,
            ),
        ]

        for ntype, ntitle, nmsg, ncomp in notifs:
            existing_n = db.query(Notification).filter(
                Notification.learner_id == aditi.id,
                Notification.title == ntitle,
            ).first()
            if not existing_n:
                db.add(Notification(
                    learner_id=aditi.id,
                    type=ntype,
                    title=ntitle,
                    message=nmsg,
                    read=False,
                    related_competency=ncomp,
                    created_at=datetime.utcnow() - timedelta(hours=12),
                ))
        db.commit()

        # 12. Public Verifiable Certificate
        print("[Demo Seed] Seeding Verifiable Achievement Certificate...")
        cert = db.query(Certificate).filter(Certificate.verification_id == "SL-2026-CERT-DEMO0001").first()
        if not cert:
            db.add(Certificate(
                verification_id="SL-2026-CERT-DEMO0001",
                learner_id=aditi.id,
                competency_id=field_comp.id if field_comp else None,
                title="SkillLens Achievement Certificate — Field Data Collection Protocols",
                achievement_name="Demonstrated Verified Proficiency in Official Survey Administration",
                issue_date=datetime.utcnow() - timedelta(days=2),
                valid=True,
                evidence_summary={
                    "cadre": "Junior Statistical Officer",
                    "department": "Ministry of Statistics and Programme Implementation",
                    "score_verified": "78.0% via AI Viva Assessment",
                    "framework": "Mission Karmayogi FRAC Calibrated",
                    "verification_type": "Automated Competency Evidence Proof",
                },
            ))
            db.commit()

        # 13. Audit Events
        print("[Demo Seed] Seeding Security & Operational Audit Log...")
        audit_records = [
            ("LOGIN", "learners", aditi.id, None, {"method": "email_password", "status": "SUCCESS"}),
            ("QUIZ_GENERATED", "quizzes", "quiz_demo_01", None, {"title": "Field Sampling Diagnostics", "questions": 10}),
            ("QUIZ_COMPLETED", "quiz_attempts", "attempt_demo_01", None, {"score": 55.0, "duration_seconds": 340}),
            ("COMPETENCY_UPDATED", "competencies", sampling_comp.id if sampling_comp else "", {"level": 2.0}, {"level": 2.2}),
            ("VIVA_COMPLETED", "viva_sessions", "viva_demo_01", None, {"competency": "Field Data Collection Protocols", "score": 78.0}),
            ("BADGE_EARNED", "badges", first_badge.id if first_badge else "", None, {"badge": "FIRST_ASSESSMENT"}),
        ]

        for etype, ent_type, ent_id, old_v, new_v in audit_records:
            db.add(AuditEvent(
                actor_id=aditi.id,
                actor_type="learner",
                event_type=etype,
                entity_type=ent_type,
                entity_id=ent_id,
                old_value=old_v,
                new_value=new_v,
                ip="127.0.0.1",
                user_agent="SkillLens-AI-DemoBrowser/1.0",
                timestamp=datetime.utcnow() - timedelta(hours=6),
            ))
        db.commit()

        # 14. Syllabus Version for Pattern Watcher
        print("[Demo Seed] Seeding Syllabus Versions...")
        v1_existing = db.query(SyllabusVersion).filter(SyllabusVersion.version == "v1.0").first()
        if not v1_existing:
            sample_v1_text = """
Unit 1: Sampling Design
- Simple Random Sampling (15%)
- Stratified Random Sampling (20%)
- Cluster Sampling (15%)

Unit 2: Field Data Collection
- Household Survey Schedules (20%)
- Data Validation Rules (15%)

Unit 3: Reporting
- Report Writing for Official Statistics (15%)
"""
            sample_v2_text = """
Unit 1: Modern Sampling Methods
- Simple Random Sampling (15%)
- Stratified Random Sampling (20%)
- Cluster & Multi-Stage Sampling (20%)
- Sampling Bias & Standard Error (10%)

Unit 2: Automated Data Quality
- Data Validation Protocols (15%)
- Outlier Detection Methods (10%)

Unit 3: Reporting & Policy Communication
- Policy Communication Essentials (10%)
"""
            from app.services.syllabus_service import parse_syllabus_text, compare_syllabus_versions
            v1_struct = parse_syllabus_text(sample_v1_text)
            v2_struct = parse_syllabus_text(sample_v2_text)
            diff = compare_syllabus_versions(v1_struct, v2_struct)

            v1 = SyllabusVersion(
                title="Statistical Cadre Foundation Curriculum 2024",
                version="v1.0",
                raw_text=sample_v1_text,
                parsed_structure=v1_struct,
                uploaded_at=datetime.utcnow() - timedelta(days=60),
            )
            db.add(v1)

            v2 = SyllabusVersion(
                title="Statistical Cadre Foundation Curriculum 2026 (Revised)",
                version="v2.0",
                raw_text=sample_v2_text,
                parsed_structure=v2_struct,
                diff_summary=diff,
                uploaded_at=datetime.utcnow() - timedelta(days=5),
            )
            db.add(v2)
            db.commit()

        print("\n=======================================================")
        print("[OK] COMPREHENSIVE DETERMINISTIC DEMO DATA SEEDED!")
        print("=======================================================")
        print("Demo Accounts:")
        print("  Learner: aditi.demo@skilllens.in / demo1234  (Junior Statistical Officer)")
        print("  Learner: rohan.demo@skilllens.in / demo1234  (Data Analyst)")
        print("  Learner: kavita.demo@skilllens.in / demo1234 (Survey Supervisor)")
        print("  Admin:   admin.demo@skilllens.in / admin1234  (Training Administrator)")
        print("Certificate Verification Code:")
        print("  SL-2026-CERT-DEMO0001 (Valid & Verified)")
        print("=======================================================\n")

    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
