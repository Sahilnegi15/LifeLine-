const BASE_URL = "https://lifeline-epao.onrender.com";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  listPatients: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/patients${qs ? `?${qs}` : ""}`);
  },
  getPatient: (id) => request(`/patients/${id}`),
  createPatient: (data) =>
    request(`/patients`, { method: "POST", body: JSON.stringify(data) }),
  updatePatient: (id, data) =>
    request(`/patients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePatient: (id) => request(`/patients/${id}`, { method: "DELETE" }),

  listVitals: (patientId) => request(`/patients/${patientId}/vitals`),
  addVital: (patientId, data) =>
    request(`/patients/${patientId}/vitals`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listConsultations: (patientId) => request(`/patients/${patientId}/consultations`),
  requestConsultation: (patientId, data) =>
    request(`/patients/${patientId}/consultations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  summaryStats: () => request(`/stats/summary`),
  statsByCentre: () => request(`/stats/by-centre`),
  statsByBirthWeightBand: () => request(`/stats/by-birth-weight-band`),

  descriptiveStats: () => request(`/analysis/descriptive-stats`),
  correlation: (fieldX, fieldY) =>
    request(`/analysis/correlation?field_x=${fieldX}&field_y=${fieldY}`),
  chiSquare: (fieldA, fieldB) =>
    request(`/analysis/chi-square?field_a=${fieldA}&field_b=${fieldB}`),
  logisticRegression: () => request(`/analysis/logistic-regression`),
  confidenceInterval: (metric) =>
    request(`/analysis/confidence-interval?metric=${encodeURIComponent(metric)}`),

  mlStatus: () => request(`/ml/status`),
  mlTrain: (modelName) =>
    request(`/ml/train?model_name=${modelName}`, { method: "POST" }),
  mlPredict: (data) =>
    request(`/ml/predict`, { method: "POST", body: JSON.stringify(data) }),
};
