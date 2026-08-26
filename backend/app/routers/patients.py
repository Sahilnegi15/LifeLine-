"""Patient registration, records, vitals, and consultation endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _apply_risk_rule(patient: models.Patient) -> str:
    """Simple rule-based risk placeholder until the ML model (Step 6) replaces it.

    Flags High risk for very low birth weight / very preterm / low Apgar,
    Medium for moderate versions of the same, else Low.
    """
    high = (
        patient.birth_weight_grams < 1500
        or patient.gestational_age_weeks < 32
        or (patient.apgar_5min is not None and patient.apgar_5min <= 3)
    )
    medium = (
        patient.birth_weight_grams < 2500
        or patient.gestational_age_weeks < 37
        or (patient.apgar_5min is not None and patient.apgar_5min <= 6)
    )
    if high:
        return "High"
    if medium:
        return "Medium"
    return "Low"


@router.post("", response_model=schemas.Patient)
def create_patient(patient_in: schemas.PatientCreate, db: Session = Depends(get_db)):
    patient = models.Patient(**patient_in.model_dump())
    patient.risk_level = _apply_risk_rule(patient)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=List[schemas.Patient])
def list_patients(
    centre: Optional[str] = None,
    outcome: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Patient)
    if centre:
        query = query.filter(models.Patient.centre == centre)
    if outcome:
        query = query.filter(models.Patient.outcome == outcome)
    if risk_level:
        query = query.filter(models.Patient.risk_level == risk_level)
    return query.order_by(models.Patient.created_at.desc()).all()


@router.get("/{patient_id}", response_model=schemas.Patient)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=schemas.Patient)
def update_patient(
    patient_id: int, patient_in: schemas.PatientUpdate, db: Session = Depends(get_db)
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for field, value in patient_in.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    # Re-run the risk rule if any clinical inputs changed and risk wasn't explicitly set
    if "risk_level" not in patient_in.model_dump(exclude_unset=True):
        patient.risk_level = _apply_risk_rule(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
    return {"detail": "Patient deleted"}


# ---------- Vitals / follow-up ----------

@router.post("/{patient_id}/vitals", response_model=schemas.VitalRecord)
def add_vital_record(
    patient_id: int, vital_in: schemas.VitalRecordCreate, db: Session = Depends(get_db)
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    vital = models.VitalRecord(patient_id=patient_id, **vital_in.model_dump())
    db.add(vital)
    db.commit()
    db.refresh(vital)
    return vital


@router.get("/{patient_id}/vitals", response_model=List[schemas.VitalRecord])
def list_vital_records(patient_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.VitalRecord)
        .filter(models.VitalRecord.patient_id == patient_id)
        .order_by(models.VitalRecord.recorded_at.desc())
        .all()
    )


# ---------- Consultations ----------

@router.post("/{patient_id}/consultations", response_model=schemas.Consultation)
def request_consultation(
    patient_id: int, consult_in: schemas.ConsultationCreate, db: Session = Depends(get_db)
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    consult = models.Consultation(patient_id=patient_id, **consult_in.model_dump())
    db.add(consult)
    db.commit()
    db.refresh(consult)
    return consult


@router.get("/{patient_id}/consultations", response_model=List[schemas.Consultation])
def list_consultations(patient_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Consultation)
        .filter(models.Consultation.patient_id == patient_id)
        .order_by(models.Consultation.created_at.desc())
        .all()
    )
