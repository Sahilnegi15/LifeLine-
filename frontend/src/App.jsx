import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import PatientList from "./pages/PatientList.jsx";
import PatientForm from "./pages/PatientForm.jsx";
import PatientDetail from "./pages/PatientDetail.jsx";
import Analysis from "./pages/Analysis.jsx";
import MLRiskModel from "./pages/MLRiskModel.jsx";

function HeartbeatRule() {
  return (
    <svg className="heartbeat-rule" viewBox="0 0 200 14" preserveAspectRatio="none">
      <polyline
        points="0,7 60,7 72,1 82,13 92,3 100,7 200,7"
        fill="none"
        stroke="#8FB3AB"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">LifeLine</div>
        <div className="brand-sub">Neonatal Research Platform</div>
        <HeartbeatRule />
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => (isActive ? "active" : "")}>
            Patients
          </NavLink>
          <NavLink
            to="/patients/new"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Register Newborn
          </NavLink>
          <NavLink to="/analysis" className={({ isActive }) => (isActive ? "active" : "")}>
            Analysis
          </NavLink>
          <NavLink to="/risk-model" className={({ isActive }) => (isActive ? "active" : "")}>
            Risk Model
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patients/new" element={<PatientForm />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/risk-model" element={<MLRiskModel />} />
        </Routes>
      </main>
    </div>
  );
}
