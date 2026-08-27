"""NeoSankalp — Neonatal Telemedicine & Research Platform (backend)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import patients, stats, analysis, ml

# Create tables on startup (fine for SQLite / dev; use Alembic migrations later)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LifeLine",
    description="Neonatal telemedicine & research monitoring platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(stats.router)
app.include_router(analysis.router)
app.include_router(ml.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
