"""
One-off migration: add onboarding wizard columns to the learners table.
Safe to run multiple times (uses IF NOT EXISTS / catches duplicate-column errors).
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.core.database import engine
from sqlalchemy import text, inspect

dialect = engine.dialect.name
print(f"Dialect: {dialect}")

if dialect == "postgresql":
    migrations = [
        "ALTER TABLE learners ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE learners ADD COLUMN IF NOT EXISTS career_goal TEXT",
        "ALTER TABLE learners ADD COLUMN IF NOT EXISTS goal_timeline_months INTEGER",
        "ALTER TABLE learners ADD COLUMN IF NOT EXISTS learning_preference VARCHAR",
    ]
else:
    # SQLite
    migrations = [
        "ALTER TABLE learners ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE learners ADD COLUMN career_goal TEXT",
        "ALTER TABLE learners ADD COLUMN goal_timeline_months INTEGER",
        "ALTER TABLE learners ADD COLUMN learning_preference VARCHAR",
    ]

with engine.connect() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"OK  : {sql[:75]}")
        except Exception as e:
            conn.rollback()
            msg = str(e).lower()
            if "duplicate column" in msg or "already exists" in msg:
                print(f"SKIP: {sql[:60]}  (column already exists)")
            else:
                print(f"ERR : {e}")

# Verify
inspector = inspect(engine)
cols = [c["name"] for c in inspector.get_columns("learners")]
needed = ["onboarding_completed", "career_goal", "goal_timeline_months", "learning_preference"]
all_ok = True
for col in needed:
    ok = col in cols
    if not ok:
        all_ok = False
    status = "YES" if ok else "MISSING"
    print(f"  {col}: {status}")

if all_ok:
    print("\nMigration complete!")
else:
    print("\nWARNING: Some columns are still missing.")
    sys.exit(1)
