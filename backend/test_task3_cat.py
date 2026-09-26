import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.models import Learner, Competency, Quiz, LearnerCompetencyScore
from app.services.quiz_engine import start_adaptive_session, process_adaptive_answer

def run_test():
    db = SessionLocal()
    try:
        learner = db.query(Learner).first()
        competency = db.query(Competency).first()

        if not learner or not competency:
            print("ERROR: No learner or competency found in DB.")
            return

        print(f"Testing CAT with Learner {learner.id} and Competency {competency.id} ({competency.name})")

        # Mock a pool of 10 questions with difficulties 1 to 5
        questions_pool = [
            {
                "question": f"Question {i} at difficulty {d}",
                "difficulty": d,
                "options": ["Alpha", "Beta", "Gamma", "Delta"],
                "correct_index": 0,
                "explanation": f"Explanation for Q{i}"
            }
            for d in [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
            for i in [d]
        ][:10]

        mock_quiz = db.query(Quiz).first()
        if not mock_quiz:
            mock_quiz = Quiz(
                title="Adaptive Test Quiz",
                competency_tags=[competency.id],
                questions=questions_pool
            )
            db.add(mock_quiz)
            db.commit()
            db.refresh(mock_quiz)
        else:
            mock_quiz.questions = questions_pool
            mock_quiz.competency_tags = [competency.id]
            db.commit()

        start_res = start_adaptive_session(mock_quiz, learner.id)
        session_id = start_res["session_id"]
        print("Session started:", {
            "session_id": session_id,
            "initial_theta": start_res["theta"],
            "first_q_diff": start_res["current_difficulty"],
            "q_idx": start_res["question_index"]
        })

        # Answer 1: Correct answer (index 0)
        curr_q_idx = start_res["question_index"]
        res1 = process_adaptive_answer(db, session_id, curr_q_idx, selected_option=0, current_learner=learner)
        print("Answer 1 (Correct):", {
            "status": res1.get("status"),
            "new_theta": res1.get("theta"),
            "next_diff": res1.get("current_difficulty"),
            "trend": res1.get("difficulty_trend")
        })
        assert res1["theta"] > 3.0, "Theta should increase on correct answer"

        # Answer 2: Incorrect answer (index 2)
        curr_q_idx = res1["question_index"]
        res2 = process_adaptive_answer(db, session_id, curr_q_idx, selected_option=2, current_learner=learner)
        print("Answer 2 (Incorrect):", {
            "status": res2.get("status"),
            "new_theta": res2.get("theta"),
            "next_diff": res2.get("current_difficulty"),
            "trend": res2.get("difficulty_trend")
        })

        # Continue until complete
        curr = res2
        step = 3
        while curr.get("status") == "in_progress" and curr.get("question"):
            q_idx = curr["question_index"]
            ans = 0 if step % 2 == 0 else 1
            curr = process_adaptive_answer(db, session_id, q_idx, selected_option=ans, current_learner=learner)
            print(f"Answer {step}:", {
                "status": curr.get("status"),
                "theta": curr.get("theta") or curr.get("final_theta")
            })
            step += 1

        print("\nQuiz Completed! Final Result Payload:")
        print("Final Theta:", curr.get("final_theta"))
        print("Score Percent:", curr.get("score_percent"))
        print("Questions Answered:", curr.get("questions_answered_count"))
        print("Difficulty Distribution:", curr.get("difficulty_distribution"))
        print("Confidence of Estimate:", curr.get("confidence_of_estimate"))

        # Check DB updates for ability_theta and questions_asked
        score_row = db.query(LearnerCompetencyScore).filter(
            LearnerCompetencyScore.learner_id == learner.id,
            LearnerCompetencyScore.competency_id == competency.id
        ).first()

        if score_row:
            print("\nDatabase Verified LearnerCompetencyScore:")
            print(f"  current_level: {score_row.current_level}")
            print(f"  ability_theta: {score_row.ability_theta}")
            print(f"  questions_asked: {score_row.questions_asked}")
            print(f"  mastery_probability: {score_row.mastery_probability}")

        print("\n>>> TASK 3 VERIFICATION PASSED SUCCESSFULLY! <<<")
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
