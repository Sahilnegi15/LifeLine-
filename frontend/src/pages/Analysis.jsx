import { useEffect, useState } from "react";
import { api } from "../api.js";

const NUMERIC_FIELDS = [
  ["birth_weight_grams", "Birth weight (g)"],
  ["gestational_age_weeks", "Gestational age (weeks)"],
  ["apgar_1min", "Apgar (1 min)"],
  ["apgar_5min", "Apgar (5 min)"],
];
const CATEGORICAL_FIELDS = [
  ["risk_level", "Risk level"],
  ["outcome", "Outcome"],
  ["centre", "Centre"],
  ["sex", "Sex"],
];

function Section({ eyebrow, title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="eyebrow">{eyebrow}</div>
      <h3>{title}</h3>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

export default function Analysis() {
  const [error, setError] = useState(null);

  const [descriptive, setDescriptive] = useState(null);

  const [corrX, setCorrX] = useState("birth_weight_grams");
  const [corrY, setCorrY] = useState("gestational_age_weeks");
  const [corrResult, setCorrResult] = useState(null);

  const [chiA, setChiA] = useState("risk_level");
  const [chiB, setChiB] = useState("outcome");
  const [chiResult, setChiResult] = useState(null);

  const [logregResult, setLogregResult] = useState(null);
  const [ciMortality, setCiMortality] = useState(null);
  const [ciMeanBw, setCiMeanBw] = useState(null);

  const run = (fn, setter) => () =>
    fn().then(setter).catch((e) => setError(e.message));

  useEffect(() => {
    api.descriptiveStats().then(setDescriptive).catch((e) => setError(e.message));
    api.confidenceInterval("mortality_rate").then(setCiMortality).catch(() => {});
    api
      .confidenceInterval("mean:birth_weight_grams")
      .then(setCiMeanBw)
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Statistical Analysis</div>
        <h1>Research analysis tools</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Section eyebrow="Descriptive statistics" title="Mean, median, SD by field">
        {descriptive ? (
          <table>
            <thead>
              <tr><th>Field</th><th>n</th><th>Mean</th><th>Median</th><th>SD</th><th>Range</th></tr>
            </thead>
            <tbody>
              {Object.entries(descriptive).map(([key, d]) => (
                <tr key={key}>
                  <td>{d.label}</td>
                  <td>{d.n}</td>
                  <td>{d.mean}</td>
                  <td>{d.median}</td>
                  <td>{d.sd ?? "—"}</td>
                  <td>{d.min} – {d.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        )}
      </Section>

      <div className="grid grid-2">
        <Section eyebrow="Correlation (Pearson)" title="Relationship between two numeric fields">
          <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
            <select value={corrX} onChange={(e) => setCorrX(e.target.value)}>
              {NUMERIC_FIELDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span style={{ color: "var(--muted)" }}>vs</span>
            <select value={corrY} onChange={(e) => setCorrY(e.target.value)}>
              {NUMERIC_FIELDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={run(() => api.correlation(corrX, corrY), setCorrResult)}>
              Run
            </button>
          </div>
          {corrResult && (
            <div>
              <div className="stat-value">r = {corrResult.pearson_r}</div>
              <div className="stat-label">p = {corrResult.p_value} · n = {corrResult.n}</div>
              <p style={{ marginTop: 8, fontSize: 13 }}>{corrResult.interpretation}</p>
            </div>
          )}
        </Section>

        <Section eyebrow="Chi-square test" title="Independence between two categories">
          <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
            <select value={chiA} onChange={(e) => setChiA(e.target.value)}>
              {CATEGORICAL_FIELDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span style={{ color: "var(--muted)" }}>vs</span>
            <select value={chiB} onChange={(e) => setChiB(e.target.value)}>
              {CATEGORICAL_FIELDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={run(() => api.chiSquare(chiA, chiB), setChiResult)}>
              Run
            </button>
          </div>
          {chiResult && (
            <div>
              <div className="stat-value">χ² = {chiResult.chi2_statistic}</div>
              <div className="stat-label">
                p = {chiResult.p_value} · df = {chiResult.degrees_of_freedom} ·{" "}
                {chiResult.significant ? "significant (p < 0.05)" : "not significant"}
              </div>
            </div>
          )}
        </Section>
      </div>

      <Section
        eyebrow="Logistic regression"
        title="Mortality risk vs. birth weight, gestational age, Apgar (5 min)"
      >
        <button className="btn btn-secondary" onClick={run(api.logisticRegression, setLogregResult)}>
          Run model
        </button>
        {logregResult && (
          <div style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr><th>Feature</th><th>Coefficient</th><th>Odds ratio</th><th>p</th><th>95% CI</th></tr>
              </thead>
              <tbody>
                {logregResult.coefficients.map((c) => (
                  <tr key={c.feature}>
                    <td>{c.feature}</td>
                    <td>{c.coefficient}</td>
                    <td>{c.odds_ratio}</td>
                    <td>{c.p_value}</td>
                    <td>{c.ci_95_low} – {c.ci_95_high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>
              n = {logregResult.n} · pseudo-R² = {logregResult.pseudo_r_squared}. {logregResult.note}
            </p>
          </div>
        )}
      </Section>

      <div className="grid grid-2">
        <Section eyebrow="Confidence interval (95%)" title="Neonatal mortality rate">
          {ciMortality ? (
            <div>
              <div className="stat-value">{ciMortality.point_estimate_percent}%</div>
              <div className="stat-label">
                95% CI: {ciMortality.ci_low_percent}% – {ciMortality.ci_high_percent}% (n = {ciMortality.n})
              </div>
            </div>
          ) : <p style={{ color: "var(--muted)" }}>—</p>}
        </Section>
        <Section eyebrow="Confidence interval (95%)" title="Mean birth weight">
          {ciMeanBw ? (
            <div>
              <div className="stat-value">{ciMeanBw.point_estimate} g</div>
              <div className="stat-label">
                95% CI: {ciMeanBw.ci_low} g – {ciMeanBw.ci_high} g (n = {ciMeanBw.n})
              </div>
            </div>
          ) : <p style={{ color: "var(--muted)" }}>—</p>}
        </Section>
      </div>
    </div>
  );
}
