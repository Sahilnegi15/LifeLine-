"""Statistical Analysis module: descriptive stats, correlation, chi-square,
logistic regression, and confidence intervals — the Step 4 module in the
project brief. Built on SciPy / statsmodels over the existing patient data.
"""
from typing import Optional, List
import numpy as np
import pandas as pd
from scipy import stats as scipy_stats
from statsmodels.stats.proportion import proportion_confint
import statsmodels.api as sm
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# Numeric clinical fields available for correlation / regression / CI endpoints
NUMERIC_FIELDS = {
    "birth_weight_grams": "Birth weight (g)",
    "gestational_age_weeks": "Gestational age (weeks)",
    "apgar_1min": "Apgar score (1 min)",
    "apgar_5min": "Apgar score (5 min)",
}


def _patients_dataframe(db: Session) -> pd.DataFrame:
    rows = db.query(models.Patient).all()
    data = [
        {
            "id": p.id,
            "sex": p.sex,
            "centre": p.centre,
            "gestational_age_weeks": p.gestational_age_weeks,
            "birth_weight_grams": p.birth_weight_grams,
            "apgar_1min": p.apgar_1min,
            "apgar_5min": p.apgar_5min,
            "risk_level": p.risk_level,
            "outcome": p.outcome,
            "deceased": 1 if p.outcome == "Deceased" else 0,
        }
        for p in rows
    ]
    return pd.DataFrame(data)


def _require_min_rows(df: pd.DataFrame, minimum: int, context: str):
    if len(df) < minimum:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Not enough data for {context}: need at least {minimum} patients, "
                f"have {len(df)}. Register more patients first."
            ),
        )


@router.get("/descriptive-stats")
def descriptive_stats(db: Session = Depends(get_db)):
    """Mean, median, SD (and n) for each numeric clinical field."""
    df = _patients_dataframe(db)
    _require_min_rows(df, 2, "descriptive statistics")

    result = {}
    for field, label in NUMERIC_FIELDS.items():
        series = df[field].dropna()
        if len(series) == 0:
            continue
        result[field] = {
            "label": label,
            "n": int(len(series)),
            "mean": round(float(series.mean()), 2),
            "median": round(float(series.median()), 2),
            "sd": round(float(series.std(ddof=1)), 2) if len(series) > 1 else None,
            "min": round(float(series.min()), 2),
            "max": round(float(series.max()), 2),
        }
    return result


@router.get("/correlation")
def correlation(
    field_x: str = Query(..., description=f"One of: {list(NUMERIC_FIELDS)}"),
    field_y: str = Query(..., description=f"One of: {list(NUMERIC_FIELDS)}"),
    db: Session = Depends(get_db),
):
    """Pearson correlation between two numeric clinical fields."""
    if field_x not in NUMERIC_FIELDS or field_y not in NUMERIC_FIELDS:
        raise HTTPException(status_code=400, detail=f"Fields must be one of {list(NUMERIC_FIELDS)}")

    df = _patients_dataframe(db)
    sub = df[[field_x, field_y]].dropna()
    _require_min_rows(sub, 3, "correlation")

    r, p_value = scipy_stats.pearsonr(sub[field_x], sub[field_y])
    return {
        "field_x": field_x,
        "field_y": field_y,
        "n": int(len(sub)),
        "pearson_r": round(float(r), 4),
        "p_value": round(float(p_value), 4),
        "interpretation": _interpret_r(r, p_value),
    }


def _interpret_r(r: float, p: float) -> str:
    strength = "weak"
    if abs(r) >= 0.7:
        strength = "strong"
    elif abs(r) >= 0.4:
        strength = "moderate"
    direction = "positive" if r >= 0 else "negative"
    significance = "statistically significant (p < 0.05)" if p < 0.05 else "not statistically significant (p ≥ 0.05)"
    return f"{strength} {direction} correlation, {significance}"


@router.get("/chi-square")
def chi_square(
    field_a: str = Query("risk_level", description="One of: risk_level, outcome, centre, sex"),
    field_b: str = Query("outcome", description="One of: risk_level, outcome, centre, sex"),
    db: Session = Depends(get_db),
):
    """Chi-square test of independence between two categorical fields."""
    categorical_fields = {"risk_level", "outcome", "centre", "sex"}
    if field_a not in categorical_fields or field_b not in categorical_fields:
        raise HTTPException(status_code=400, detail=f"Fields must be one of {sorted(categorical_fields)}")
    if field_a == field_b:
        raise HTTPException(status_code=400, detail="field_a and field_b must be different")

    df = _patients_dataframe(db)
    sub = df[[field_a, field_b]].dropna()
    _require_min_rows(sub, 5, "chi-square test")

    contingency = pd.crosstab(sub[field_a], sub[field_b])
    if contingency.shape[0] < 2 or contingency.shape[1] < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 categories in each field to run a chi-square test.",
        )

    chi2, p_value, dof, expected = scipy_stats.chi2_contingency(contingency)
    return {
        "field_a": field_a,
        "field_b": field_b,
        "contingency_table": contingency.to_dict(),
        "chi2_statistic": round(float(chi2), 4),
        "degrees_of_freedom": int(dof),
        "p_value": round(float(p_value), 4),
        "significant": bool(p_value < 0.05),
    }


@router.get("/logistic-regression")
def logistic_regression(db: Session = Depends(get_db)):
    """Logistic regression predicting mortality from birth weight, gestational
    age, and 5-min Apgar score. Returns coefficients, odds ratios, and 95% CIs
    (statsmodels — gives proper inferential statistics, unlike sklearn)."""
    df = _patients_dataframe(db)
    features = ["birth_weight_grams", "gestational_age_weeks", "apgar_5min"]
    sub = df[features + ["deceased"]].dropna()
    _require_min_rows(sub, 15, "logistic regression")

    if sub["deceased"].nunique() < 2:
        raise HTTPException(
            status_code=400,
            detail="Need both deceased and surviving cases in the data to fit a logistic regression.",
        )

    X = sm.add_constant(sub[features])
    y = sub["deceased"]
    try:
        model = sm.Logit(y, X).fit(disp=0)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Model failed to converge: {e}")

    conf = model.conf_int()
    conf.columns = ["ci_low", "ci_high"]

    results = []
    for name in X.columns:
        coef = model.params[name]
        results.append(
            {
                "feature": name,
                "coefficient": round(float(coef), 4),
                "odds_ratio": round(float(np.exp(coef)), 4),
                "p_value": round(float(model.pvalues[name]), 4),
                "ci_95_low": round(float(np.exp(conf.loc[name, "ci_low"])), 4),
                "ci_95_high": round(float(np.exp(conf.loc[name, "ci_high"])), 4),
            }
        )

    return {
        "n": int(len(sub)),
        "target": "mortality (outcome == Deceased)",
        "features": features,
        "pseudo_r_squared": round(float(model.prsquared), 4),
        "coefficients": results,
        "note": "Odds ratio > 1 means higher values of that feature are associated with higher odds of mortality.",
    }


@router.get("/confidence-interval")
def confidence_interval(
    metric: str = Query("mortality_rate", description="mortality_rate | mean:<numeric_field>"),
    confidence: float = Query(0.95, ge=0.5, le=0.999),
    db: Session = Depends(get_db),
):
    """95% CI for either the mortality rate (Wilson score interval, proportion)
    or the mean of a numeric field (t-distribution interval)."""
    df = _patients_dataframe(db)

    if metric == "mortality_rate":
        _require_min_rows(df, 5, "confidence interval")
        n = len(df)
        deaths = int(df["deceased"].sum())
        low, high = proportion_confint(deaths, n, alpha=1 - confidence, method="wilson")
        return {
            "metric": "mortality_rate",
            "n": n,
            "point_estimate_percent": round(deaths / n * 100, 2),
            "confidence_level": confidence,
            "ci_low_percent": round(low * 100, 2),
            "ci_high_percent": round(high * 100, 2),
        }

    if metric.startswith("mean:"):
        field = metric.split(":", 1)[1]
        if field not in NUMERIC_FIELDS:
            raise HTTPException(status_code=400, detail=f"Field must be one of {list(NUMERIC_FIELDS)}")
        series = df[field].dropna()
        _require_min_rows(series.to_frame(), 3, "confidence interval")
        mean = series.mean()
        sem = scipy_stats.sem(series)
        low, high = scipy_stats.t.interval(confidence, len(series) - 1, loc=mean, scale=sem)
        return {
            "metric": f"mean:{field}",
            "n": int(len(series)),
            "point_estimate": round(float(mean), 2),
            "confidence_level": confidence,
            "ci_low": round(float(low), 2),
            "ci_high": round(float(high), 2),
        }

    raise HTTPException(status_code=400, detail="metric must be 'mortality_rate' or 'mean:<field>'")
