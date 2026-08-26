"""SQLAlchemy ORM models for NeoSankalp."""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sex = Column(String, nullable=False)  # "M" or "F"
    date_of_birth = Column(Date, nullable=False)
    mother_name = Column(String, nullable=True)
    centre = Column(String, nullable=False, index=True)

    gestational_age_weeks = Column(Float, nullable=False)
    birth_weight_grams = Column(Float, nullable=False)
    apgar_1min = Column(Integer, nullable=True)
    apgar_5min = Column(Integer, nullable=True)

    complications = Column(Text, nullable=True)
    risk_level = Column(String, nullable=True)  # Low / Medium / High (set later by rules or ML)
    outcome = Column(String, nullable=False, default="Under Treatment")
    # Under Treatment / Recovered / Referred / Deceased

    created_at = Column(DateTime, default=datetime.utcnow)

    vitals = relationship(
        "VitalRecord", back_populates="patient", cascade="all, delete-orphan"
    )
    consultations = relationship(
        "Consultation", back_populates="patient", cascade="all, delete-orphan"
    )


class VitalRecord(Base):
    """Follow-up / vitals entries recorded over time for a patient."""
    __tablename__ = "vital_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    weight_grams = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)
    spo2 = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="vitals")


class Consultation(Base):
    """Teleconsultation request + doctor's notes (placeholder for WebRTC module)."""
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    requested_by = Column(String, nullable=True)  # health worker name
    doctor_name = Column(String, nullable=True)
    status = Column(String, default="Requested")  # Requested / In Progress / Completed
    notes = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="consultations")
