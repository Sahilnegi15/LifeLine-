"""Pydantic schemas for request/response validation."""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ---------- Patient ----------

class PatientBase(BaseModel):
    name: str
    sex: str
    date_of_birth: date
    mother_name: Optional[str] = None
    centre: str
    gestational_age_weeks: float
    birth_weight_grams: float
    apgar_1min: Optional[int] = None
    apgar_5min: Optional[int] = None
    complications: Optional[str] = None
    outcome: Optional[str] = "Under Treatment"


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    sex: Optional[str] = None
    date_of_birth: Optional[date] = None
    mother_name: Optional[str] = None
    centre: Optional[str] = None
    gestational_age_weeks: Optional[float] = None
    birth_weight_grams: Optional[float] = None
    apgar_1min: Optional[int] = None
    apgar_5min: Optional[int] = None
    complications: Optional[str] = None
    risk_level: Optional[str] = None
    outcome: Optional[str] = None


class Patient(PatientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    risk_level: Optional[str] = None
    created_at: datetime


# ---------- Vital records ----------

class VitalRecordBase(BaseModel):
    weight_grams: Optional[float] = None
    temperature_c: Optional[float] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    spo2: Optional[float] = None
    notes: Optional[str] = None


class VitalRecordCreate(VitalRecordBase):
    pass


class VitalRecord(VitalRecordBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    recorded_at: datetime


# ---------- Consultations ----------

class ConsultationBase(BaseModel):
    requested_by: Optional[str] = None
    doctor_name: Optional[str] = None
    notes: Optional[str] = None
    recommendations: Optional[str] = None
    status: Optional[str] = "Requested"


class ConsultationCreate(ConsultationBase):
    pass


class Consultation(ConsultationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    created_at: datetime
    completed_at: Optional[datetime] = None


# ---------- Stats ----------

class SummaryStats(BaseModel):
    total_patients: int
    total_centres: int
    outcome_breakdown: dict
    avg_birth_weight_grams: Optional[float]
    avg_gestational_age_weeks: Optional[float]
    low_birth_weight_count: int  # < 2500g
    preterm_count: int  # < 37 weeks
    mortality_rate_percent: Optional[float]
