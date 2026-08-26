import { useEffect, useState } from "react";
import { api } from "../api.js";

const initialPredictForm = {
  gestational_age_weeks: "",
  birth_weight_grams: "",
  apgar_1min: "",
  apgar_5min: "",
};

export default function MLRiskModel() {
  const [modelName, setModelName] = useState("random_forest");
  const [metrics, setMetrics] = useState(null);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);

  const [predictForm, setPredictForm] = useState(initialPredictForm);
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    api.mlStatus().then((s) => s.trained && setMetrics(s.metrics)).catch(() => {});
  }, []);

  const train = async () => {
    setTraining(true);
    setError(null);
    try {
      const m = await api.mlTrain(modelName);
      setMetrics(m);
    } catch (e) {
      setError(e.message);
    } finally {
      setTraining(false);
    }
  };

  const predict = async (e) => {
    e.preventDefault();
    setPredicting(true);
    setError(null);
    try {
      const result = await api.mlPredict({
        gestational_age_weeks: parseFloat(predictForm.gestational_age_weeks),
        birth_weight_grams: parseFloat(predictForm.birth_weight_grams),
        apgar_1min: predictForm.apgar_1min ? parseInt(predictForm.apgar_1min, 10) : null,
        apgar_5min: predictForm.apgar_5min ? parseInt(predictForm.apgar_5min, 10) : null,
      });
      setPrediction(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">ML Risk Prediction</div>
        <h1>Risk classification model</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Train / retrain</h3>
        <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 14, alignItems: "center" }}>
          <select value={modelName} onChange={(e) => setModelName(e.target.value)}>
            <option value="random_forest">Random Forest</option>
            <option value="logistic_regression">Logistic Regression</option>
          </select>
          <button className="btn" onClick={train} disabled={training}>
            {training ? "Training…" : "Train model"}
          </button>
        </div>

        {metrics && (
          <>
            <div className="grid grid-4" style={{ marginBottom: 14 }}>
              <div className="stat-card">
                <div className="stat-value">{metrics.accuracy}</div>
                <div className="stat-label">Accuracy</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{metrics.precision_macro}</div>
                <div className="stat-label">Precision (macro)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{metrics.recall_macro}</div>
                <div className="stat-label">Recall (macro)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{metrics.f1_macro}</div>
                <div className="stat-label">F1 (macro)</div>
              </div>
            </div>
            <p style={{ fontSize: 13, marginBottom: 10 }}>
              ROC-AUC: <strong>{metrics.roc_auc ?? "—"}</strong> · trained on {metrics.trained_on_n} patients,
              tested on {metrics.test_set_n} · classes: {metrics.classes.join(", ")}
            </p>

            <h3 style={{ fontSize: 15, marginTop: 16 }}>Confusion matrix</h3>
            <table style={{ marginTop: 8, maxWidth: 420 }}>
              <thead>
                <tr>
                  <th></th>
                  {metrics.classes.map((c) => <th key={c}>Pred: {c}</th>)}
                </tr>
              </thead>
              <tbody>
                {metrics.confusion_matrix.map((row, i) => (
                  <tr key={i}>
                    <th style={{ textAlign: "left" }}>Actual: {metrics.classes[i]}</th>
                    {row.map((v, j) => <td key={j}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>

            {metrics.note && (
              <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>{metrics.note}</p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h3>Predict risk for a new case</h3>
        <form onSubmit={predict} style={{ marginTop: 10 }}>
          <div className="grid grid-2">
            <div className="field">
              <label>Gestational age (weeks)</label>
              <input
                required
                type="number"
                step="0.1"
                value={predictForm.gestational_age_weeks}
                onChange={(e) => setPredictForm((f) => ({ ...f, gestational_age_weeks: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Birth weight (grams)</label>
              <input
                required
                type="number"
                value={predictForm.birth_weight_grams}
                onChange={(e) => setPredictForm((f) => ({ ...f, birth_weight_grams: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Apgar — 1 min</label>
              <input
                type="number"
                min="0"
                max="10"
                value={predictForm.apgar_1min}
                onChange={(e) => setPredictForm((f) => ({ ...f, apgar_1min: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Apgar — 5 min</label>
              <input
                type="number"
                min="0"
                max="10"
                value={predictForm.apgar_5min}
                onChange={(e) => setPredictForm((f) => ({ ...f, apgar_5min: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn" type="submit" disabled={predicting}>
            {predicting ? "Predicting…" : "Predict risk level"}
          </button>
        </form>

        {prediction && (
          <div style={{ marginTop: 16 }}>
            <span className={`badge badge-${prediction.predicted_risk_level}`}>
              {prediction.predicted_risk_level} risk
            </span>
            <table style={{ marginTop: 12, maxWidth: 320 }}>
              <thead><tr><th>Class</th><th>Probability</th></tr></thead>
              <tbody>
                {Object.entries(prediction.probabilities).map(([cls, p]) => (
                  <tr key={cls}><td>{cls}</td><td>{(p * 100).toFixed(1)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
