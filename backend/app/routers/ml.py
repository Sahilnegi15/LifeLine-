"""ML Risk Prediction module (Step 5 in the brief).

Trains a classifier on the clinical features already captured for each
patient to predict Low / Medium / High risk, and reports standard
classification metrics. The model is held in memory and refreshed by
POST /train — swap in a persisted/versioned model store before production use.
"""
from typing import Optional, List
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import (
    precision_recall_fscore_support,
    accuracy_score,
    roc_auc_score,
    confusion_matrix,
)

from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/ml", tags=["ml"])

FEATURES = ["gestational_age_weeks", "birth_weight_grams", "apgar_1min", "apgar_5min"]
TARGET = "risk_level"

# In-memory model registry (per process). Swap for a persisted model
# (joblib.dump to disk, or a model-versioning table) before production use.
_MODEL_STATE = {"model": None, "model_name": None, "label_encoder": None, "metrics": None}


class PredictRequest(BaseModel):
    gestational_age_weeks: float
    birth_weight_grams: float
    apgar_1min: Optional[int] = None
    apgar_5min: Optional[int] = None


def _dataframe(db: Session) -> pd.DataFrame:
    rows = db.query(models.Patient).all()
    return pd.DataFrame(
        [
            {
                "gestational_age_weeks": p.gestational_age_weeks,
                "birth_weight_grams": p.birth_weight_grams,
                "apgar_1min": p.apgar_1min,
                "apgar_5min": p.apgar_5min,
                "risk_level": p.risk_level,
            }
            for p in rows
        ]
    )


@router.post("/train")
def train_model(model_name: str = "random_forest", db: Session = Depends(get_db)):
    """Train (or retrain) the risk classifier on all current patient records.

    model_name: 'random_forest' or 'logistic_regression'
    """
    df = _dataframe(db).dropna(subset=FEATURES + [TARGET])
    if len(df) < 20:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Need at least 20 fully-recorded patients to train a model, have {len(df)}. "
                "Register more patients (or run the demo seed script) first."
            ),
        )
    if df[TARGET].nunique() < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 distinct risk levels in the data to train.")

    X = df[FEATURES]
    y_raw = df[TARGET]
    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    # Stratify when every class has enough members for a test split; fall back otherwise.
    stratify = y if min(np.bincount(y)) >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=stratify
    )

    if model_name == "logistic_regression":
        # Scale features first — Apgar (0-10) and birth weight (hundreds-thousands)
        # are on very different scales, which hurts LR convergence otherwise.
        clf = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))
    else:
        model_name = "random_forest"
        clf = RandomForestClassifier(n_estimators=200, random_state=42)

    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)

    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="macro", zero_division=0
    )
    accuracy = accuracy_score(y_test, y_pred)

    roc_auc = None
    try:
        y_proba = clf.predict_proba(X_test)
        if len(le.classes_) == 2:
            roc_auc = roc_auc_score(y_test, y_proba[:, 1])
        else:
            roc_auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")
    except Exception:
        roc_auc = None  # not enough class variety in the test split

    cm = confusion_matrix(y_test, y_pred).tolist()

    metrics = {
        "model": model_name,
        "trained_on_n": int(len(df)),
        "test_set_n": int(len(y_test)),
        "classes": le.classes_.tolist(),
        "accuracy": round(float(accuracy), 4),
        "precision_macro": round(float(precision), 4),
        "recall_macro": round(float(recall), 4),
        "f1_macro": round(float(f1), 4),
        "roc_auc": round(float(roc_auc), 4) if roc_auc is not None else None,
        "confusion_matrix": cm,
        "note": (
            "risk_level labels are currently rule-derived from these same features "
            "(see _apply_risk_rule in patients.py), so high accuracy here mostly "
            "confirms the model learned the rule. Swap in clinician-confirmed or "
            "outcome-validated risk labels for a metric that reflects real predictive value."
        ),
    }

    _MODEL_STATE["model"] = clf
    _MODEL_STATE["model_name"] = model_name
    _MODEL_STATE["label_encoder"] = le
    _MODEL_STATE["metrics"] = metrics

    return metrics


@router.get("/status")
def model_status():
    if _MODEL_STATE["model"] is None:
        return {"trained": False}
    return {"trained": True, "metrics": _MODEL_STATE["metrics"]}


@router.post("/predict")
def predict_risk(payload: PredictRequest):
    if _MODEL_STATE["model"] is None:
        raise HTTPException(status_code=400, detail="No model trained yet. Call POST /api/ml/train first.")

    clf = _MODEL_STATE["model"]
    le = _MODEL_STATE["label_encoder"]

    row = pd.DataFrame([{
        "gestational_age_weeks": payload.gestational_age_weeks,
        "birth_weight_grams": payload.birth_weight_grams,
        "apgar_1min": payload.apgar_1min if payload.apgar_1min is not None else np.nan,
        "apgar_5min": payload.apgar_5min if payload.apgar_5min is not None else np.nan,
    }])[FEATURES]

    if row.isnull().any(axis=None):
        raise HTTPException(
            status_code=400,
            detail="apgar_1min and apgar_5min are required for this model's prediction — fill in all fields.",
        )

    pred_class = clf.predict(row)[0]
    pred_label = le.inverse_transform([pred_class])[0]
    proba = clf.predict_proba(row)[0]
    probabilities = {le.classes_[i]: round(float(p), 4) for i, p in enumerate(proba)}

    return {
        "predicted_risk_level": pred_label,
        "probabilities": probabilities,
        "model": _MODEL_STATE["model_name"],
    }
