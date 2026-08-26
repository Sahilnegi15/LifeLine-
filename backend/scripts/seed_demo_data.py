"""Generate synthetic demo patients so the stats/ML endpoints have something
to work with. NOT real clinical data — for local development only.

Run from backend/: python scripts/seed_demo_data.py [n]
"""
import random
import sys
from datetime import date, timedelta

sys.path.insert(0, ".")
from app.database import SessionLocal, engine, Base
from app import models
from app.routers.patients import _apply_risk_rule

CENTRES = [
    "Doon Hospital, Dehradun",
    "AIIMS Rishikesh",
    "District Hospital, Haridwar",
    "CHC Vikasnagar",
]
random.seed(42)


def make_patient(i: int) -> models.Patient:
    # Correlate risk factors with each other and with outcome, roughly like real NICU data
    ga = round(random.gauss(36, 3.2), 1)
    ga = max(24, min(42, ga))
    bw = round(random.gauss(2600 + (ga - 36) * 150, 450))
    bw = max(500, bw)
    apgar1 = max(0, min(10, round(random.gauss(7.5 - (42 - ga) * 0.15, 1.5))))
    apgar5 = max(0, min(10, apgar1 + random.choice([0, 0, 1, 1, 2])))

    risk_score = 0
    if bw < 1500: risk_score += 2
    elif bw < 2500: risk_score += 1
    if ga < 32: risk_score += 2
    elif ga < 37: risk_score += 1
    if apgar5 <= 3: risk_score += 2
    elif apgar5 <= 6: risk_score += 1

    death_prob = min(0.65, 0.02 + risk_score * 0.09)
    outcome = "Deceased" if random.random() < death_prob else random.choice(
        ["Recovered", "Recovered", "Recovered", "Referred", "Under Treatment"]
    )

    dob = date(2026, 1, 1) + timedelta(days=random.randint(0, 230))

    p = models.Patient(
        name=f"Baby {i:03d}",
        sex=random.choice(["M", "F"]),
        date_of_birth=dob,
        mother_name=f"Mother {i:03d}",
        centre=random.choice(CENTRES),
        gestational_age_weeks=ga,
        birth_weight_grams=bw,
        apgar_1min=apgar1,
        apgar_5min=apgar5,
        complications="Respiratory distress" if risk_score >= 3 else None,
        outcome=outcome,
    )
    p.risk_level = _apply_risk_rule(p)
    return p


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(models.Patient).count()
        patients = [make_patient(existing + i + 1) for i in range(n)]
        db.add_all(patients)
        db.commit()
        print(f"Inserted {n} synthetic patients (total now: {existing + n}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
