"""Research dashboard: summary statistics and breakdowns.

This is a starting point for the Research Dashboard / Statistical Analysis
modules described in the project brief. It currently covers descriptive
stats; chi-square, correlation, logistic regression, and CIs (SciPy /
statsmodels) can be added here as additional endpoints later.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/summary", response_model=schemas.SummaryStats)
def summary(db: Session = Depends(get_db)):
    total = db.query(func.count(models.Patient.id)).scalar() or 0
    total_centres = (
        db.query(func.count(func.distinct(models.Patient.centre))).scalar() or 0
    )

    outcome_rows = (
        db.query(models.Patient.outcome, func.count(models.Patient.id))
        .group_by(models.Patient.outcome)
        .all()
    )
    outcome_breakdown = {outcome: count for outcome, count in outcome_rows}

    avg_bw = db.query(func.avg(models.Patient.birth_weight_grams)).scalar()
    avg_ga = db.query(func.avg(models.Patient.gestational_age_weeks)).scalar()

    low_bw_count = (
        db.query(func.count(models.Patient.id))
        .filter(models.Patient.birth_weight_grams < 2500)
        .scalar()
        or 0
    )
    preterm_count = (
        db.query(func.count(models.Patient.id))
        .filter(models.Patient.gestational_age_weeks < 37)
        .scalar()
        or 0
    )

    deceased = outcome_breakdown.get("Deceased", 0)
    mortality_rate = (deceased / total * 100) if total > 0 else None

    return schemas.SummaryStats(
        total_patients=total,
        total_centres=total_centres,
        outcome_breakdown=outcome_breakdown,
        avg_birth_weight_grams=round(avg_bw, 1) if avg_bw else None,
        avg_gestational_age_weeks=round(avg_ga, 1) if avg_ga else None,
        low_birth_weight_count=low_bw_count,
        preterm_count=preterm_count,
        mortality_rate_percent=round(mortality_rate, 2) if mortality_rate is not None else None,
    )


@router.get("/by-centre")
def stats_by_centre(db: Session = Depends(get_db)):
    """Centre-wise patient counts and mortality — feeds the centre-wise
    statistics view in the Research Dashboard."""
    rows = (
        db.query(
            models.Patient.centre,
            func.count(models.Patient.id).label("total"),
            func.sum(
                case((models.Patient.outcome == "Deceased", 1), else_=0)
            ).label("deceased"),
        )
        .group_by(models.Patient.centre)
        .all()
    )
    return [
        {
            "centre": r.centre,
            "total_patients": r.total,
            "deceased": r.deceased or 0,
            "mortality_rate_percent": round((r.deceased or 0) / r.total * 100, 2)
            if r.total
            else None,
        }
        for r in rows
    ]


@router.get("/by-birth-weight-band")
def mortality_by_birth_weight(db: Session = Depends(get_db)):
    """Mortality broken down by standard birth-weight bands (grams)."""
    bands = [
        ("<1000", 0, 1000),
        ("1000-1499", 1000, 1500),
        ("1500-2499", 1500, 2500),
        ("2500+", 2500, 100000),
    ]
    result = []
    for label, lo, hi in bands:
        q = db.query(models.Patient).filter(
            models.Patient.birth_weight_grams >= lo,
            models.Patient.birth_weight_grams < hi,
        )
        total = q.count()
        deceased = q.filter(models.Patient.outcome == "Deceased").count()
        result.append(
            {
                "band": label,
                "total_patients": total,
                "deceased": deceased,
                "mortality_rate_percent": round(deceased / total * 100, 2)
                if total
                else None,
            }
        )
    return result
