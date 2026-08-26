import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

const initialState = {
  name: "",
  sex: "F",
  date_of_birth: "",
  mother_name: "",
  centre: "",
  gestational_age_weeks: "",
  birth_weight_grams: "",
  apgar_1min: "",
  apgar_5min: "",
  complications: "",
  outcome: "Under Treatment",
};

export default function PatientForm() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        gestational_age_weeks: parseFloat(form.gestational_age_weeks),
        birth_weight_grams: parseFloat(form.birth_weight_grams),
        apgar_1min: form.apgar_1min ? parseInt(form.apgar_1min, 10) : null,
        apgar_5min: form.apgar_5min ? parseInt(form.apgar_5min, 10) : null,
      };
      const patient = await api.createPatient(payload);
      navigate(`/patients/${patient.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Patient Data Management</div>
        <h1>Register newborn</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
        <div className="grid grid-2">
          <div className="field">
            <label>Baby's name / ID</label>
            <input required value={form.name} onChange={update("name")} />
          </div>
          <div className="field">
            <label>Sex</label>
            <select value={form.sex} onChange={update("sex")}>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </div>
          <div className="field">
            <label>Date of birth</label>
            <input
              required
              type="date"
              value={form.date_of_birth}
              onChange={update("date_of_birth")}
            />
          </div>
          <div className="field">
            <label>Mother's name</label>
            <input value={form.mother_name} onChange={update("mother_name")} />
          </div>
          <div className="field">
            <label>Centre / facility</label>
            <input required value={form.centre} onChange={update("centre")} />
          </div>
          <div className="field">
            <label>Outcome</label>
            <select value={form.outcome} onChange={update("outcome")}>
              <option>Under Treatment</option>
              <option>Recovered</option>
              <option>Referred</option>
              <option>Deceased</option>
            </select>
          </div>
          <div className="field">
            <label>Gestational age (weeks)</label>
            <input
              required
              type="number"
              step="0.1"
              value={form.gestational_age_weeks}
              onChange={update("gestational_age_weeks")}
            />
          </div>
          <div className="field">
            <label>Birth weight (grams)</label>
            <input
              required
              type="number"
              step="1"
              value={form.birth_weight_grams}
              onChange={update("birth_weight_grams")}
            />
          </div>
          <div className="field">
            <label>Apgar score — 1 min</label>
            <input
              type="number"
              min="0"
              max="10"
              value={form.apgar_1min}
              onChange={update("apgar_1min")}
            />
          </div>
          <div className="field">
            <label>Apgar score — 5 min</label>
            <input
              type="number"
              min="0"
              max="10"
              value={form.apgar_5min}
              onChange={update("apgar_5min")}
            />
          </div>
        </div>
        <div className="field">
          <label>Complications</label>
          <textarea
            rows={3}
            value={form.complications}
            onChange={update("complications")}
          />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Register newborn"}
        </button>
      </form>
    </div>
  );
}
