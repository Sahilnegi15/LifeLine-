import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [error, setError] = useState(null);

  const [vitalForm, setVitalForm] = useState({
    weight_grams: "",
    temperature_c: "",
    heart_rate: "",
    respiratory_rate: "",
    spo2: "",
    notes: "",
  });
  const [consultForm, setConsultForm] = useState({
    requested_by: "",
    notes: "",
  });

  const load = () => {
    api.getPatient(id).then(setPatient).catch((e) => setError(e.message));
    api.listVitals(id).then(setVitals).catch(() => {});
    api.listConsultations(id).then(setConsultations).catch(() => {});
  };

  useEffect(load, [id]);

  const submitVital = async (e) => {
    e.preventDefault();
    const payload = {
      weight_grams: vitalForm.weight_grams ? parseFloat(vitalForm.weight_grams) : null,
      temperature_c: vitalForm.temperature_c ? parseFloat(vitalForm.temperature_c) : null,
      heart_rate: vitalForm.heart_rate ? parseInt(vitalForm.heart_rate, 10) : null,
      respiratory_rate: vitalForm.respiratory_rate
        ? parseInt(vitalForm.respiratory_rate, 10)
        : null,
      spo2: vitalForm.spo2 ? parseFloat(vitalForm.spo2) : null,
      notes: vitalForm.notes || null,
    };
    try {
      await api.addVital(id, payload);
      setVitalForm({
        weight_grams: "",
        temperature_c: "",
        heart_rate: "",
        respiratory_rate: "",
        spo2: "",
        notes: "",
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitConsultation = async (e) => {
    e.preventDefault();
    try {
      await api.requestConsultation(id, consultForm);
      setConsultForm({ requested_by: "", notes: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <div className="error-banner">{error}</div>;
  if (!patient) return <div className="empty-state">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">
          <Link to="/patients">← All patients</Link>
        </div>
        <h1>{patient.name}</h1>
        <div style={{ color: "var(--muted)", marginTop: 4 }}>
          {patient.centre} · Born {patient.date_of_birth} ·{" "}
          <span className={`badge badge-${patient.risk_level}`}>
            {patient.risk_level} risk
          </span>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Birth details</h3>
          <table style={{ marginTop: 10 }}>
            <tbody>
              <tr><td>Sex</td><td>{patient.sex}</td></tr>
              <tr><td>Mother</td><td>{patient.mother_name || "—"}</td></tr>
              <tr><td>Gestational age</td><td>{patient.gestational_age_weeks} weeks</td></tr>
              <tr><td>Birth weight</td><td>{patient.birth_weight_grams} g</td></tr>
              <tr><td>Apgar (1 / 5 min)</td><td>{patient.apgar_1min ?? "—"} / {patient.apgar_5min ?? "—"}</td></tr>
              <tr><td>Complications</td><td>{patient.complications || "None recorded"}</td></tr>
              <tr><td>Outcome</td><td>{patient.outcome}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Add vitals / follow-up</h3>
          <form onSubmit={submitVital} style={{ marginTop: 10 }}>
            <div className="grid grid-2">
              <div className="field">
                <label>Weight (g)</label>
                <input
                  value={vitalForm.weight_grams}
                  onChange={(e) => setVitalForm((f) => ({ ...f, weight_grams: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Temp (°C)</label>
                <input
                  value={vitalForm.temperature_c}
                  onChange={(e) => setVitalForm((f) => ({ ...f, temperature_c: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Heart rate</label>
                <input
                  value={vitalForm.heart_rate}
                  onChange={(e) => setVitalForm((f) => ({ ...f, heart_rate: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>SpO2 (%)</label>
                <input
                  value={vitalForm.spo2}
                  onChange={(e) => setVitalForm((f) => ({ ...f, spo2: e.target.value }))}
                />
              </div>
            </div>
            <div className="field">
              <label>Notes</label>
              <input
                value={vitalForm.notes}
                onChange={(e) => setVitalForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <button className="btn" type="submit">Save vitals</button>
          </form>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Vitals history</h3>
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr><th>Recorded</th><th>Weight</th><th>HR</th><th>SpO2</th></tr>
            </thead>
            <tbody>
              {vitals.length === 0 && (
                <tr><td colSpan={4} style={{ color: "var(--muted)" }}>No vitals recorded yet</td></tr>
              )}
              {vitals.map((v) => (
                <tr key={v.id}>
                  <td>{new Date(v.recorded_at).toLocaleString()}</td>
                  <td>{v.weight_grams ?? "—"} g</td>
                  <td>{v.heart_rate ?? "—"}</td>
                  <td>{v.spo2 ?? "—"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Teleconsultation</h3>
          <form onSubmit={submitConsultation} style={{ marginTop: 10, marginBottom: 16 }}>
            <div className="field">
              <label>Requested by (health worker)</label>
              <input
                value={consultForm.requested_by}
                onChange={(e) => setConsultForm((f) => ({ ...f, requested_by: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Reason / notes</label>
              <input
                value={consultForm.notes}
                onChange={(e) => setConsultForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <button className="btn" type="submit">Request consultation</button>
          </form>
          <table>
            <thead>
              <tr><th>Status</th><th>Requested by</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {consultations.length === 0 && (
                <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No consultations yet</td></tr>
              )}
              {consultations.map((c) => (
                <tr key={c.id}>
                  <td>{c.status}</td>
                  <td>{c.requested_by || "—"}</td>
                  <td>{c.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>
            WebRTC video calling isn't wired up yet — this records the
            consultation request and doctor's notes. Video can be added here later.
          </p>
        </div>
      </div>
    </div>
  );
}
