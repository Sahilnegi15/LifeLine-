import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listPatients()
      .then(setPatients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}
      >
        <div>
          <div className="eyebrow">Patient Data Management</div>
          <h1>Registered newborns</h1>
        </div>
        <Link to="/patients/new" className="btn">
          + Register newborn
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            No newborns registered yet. Click "Register newborn" to add the first record.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Centre</th>
                <th>Gest. age</th>
                <th>Birth weight</th>
                <th>Risk</th>
                <th>Outcome</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.centre}</td>
                  <td>{p.gestational_age_weeks} wk</td>
                  <td>{p.birth_weight_grams} g</td>
                  <td>
                    <span className={`badge badge-${p.risk_level}`}>
                      {p.risk_level}
                    </span>
                  </td>
                  <td>{p.outcome}</td>
                  <td>
                    <Link to={`/patients/${p.id}`} className="btn btn-secondary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
