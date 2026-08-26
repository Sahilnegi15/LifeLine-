import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  Cell,
  Legend,
} from "recharts";
import { api } from "../api.js";

const RISK_COLORS = { Low: "#2E7D6B", Medium: "#C98A2C", High: "#C7522A" };

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [byCentre, setByCentre] = useState([]);
  const [byBand, setByBand] = useState([]);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.summaryStats(),
      api.statsByCentre(),
      api.statsByBirthWeightBand(),
      api.listPatients(),
    ])
      .then(([s, c, b, p]) => {
        setSummary(s);
        setByCentre(c);
        setByBand(b);
        setPatients(p);
      })
      .catch((e) => setError(e.message));
  }, []);

  const scatterByRisk = { Low: [], Medium: [], High: [] };
  patients.forEach((p) => {
    if (scatterByRisk[p.risk_level]) {
      scatterByRisk[p.risk_level].push({
        x: p.gestational_age_weeks,
        y: p.birth_weight_grams,
      });
    }
  });

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Research Dashboard</div>
        <h1>Cohort overview</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {summary && (
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-value">{summary.total_patients}</div>
            <div className="stat-label">Newborns registered</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {summary.mortality_rate_percent ?? "—"}
              {summary.mortality_rate_percent !== null ? "%" : ""}
            </div>
            <div className="stat-label">Neonatal mortality rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {summary.avg_birth_weight_grams ?? "—"} g
            </div>
            <div className="stat-label">Avg. birth weight</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {summary.avg_gestational_age_weeks ?? "—"} wk
            </div>
            <div className="stat-label">Avg. gestational age</div>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Mortality by birth-weight band</h3>
          <div style={{ height: 240, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBand}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF1F0" />
                <XAxis dataKey="band" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v, name) => [v, name === "mortality_rate_percent" ? "Mortality %" : name]}
                />
                <Bar dataKey="mortality_rate_percent" fill="#C7522A" name="Mortality %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>Centre-wise mortality</h3>
          <div style={{ height: 240, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCentre} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF1F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="centre"
                  tick={{ fontSize: 10 }}
                  width={140}
                  tickFormatter={(v) => (v.length > 18 ? v.slice(0, 18) + "…" : v)}
                />
                <Tooltip />
                <Bar dataKey="mortality_rate_percent" fill="#2E7D6B" name="Mortality %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Birth weight vs. gestational age, by risk level</h3>
        <div style={{ height: 320, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECF1F0" />
              <XAxis
                type="number"
                dataKey="x"
                name="Gestational age"
                unit="wk"
                tick={{ fontSize: 11 }}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Birth weight"
                unit="g"
                tick={{ fontSize: 11 }}
                domain={["dataMin - 100", "dataMax + 100"]}
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              {Object.entries(scatterByRisk).map(([risk, points]) => (
                <Scatter key={risk} name={risk} data={points} fill={RISK_COLORS[risk]} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      
    </div>
  );
}
