const port = import.meta.env.VITE_API_PORT || '3001';
const BASE_URL = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:${port}`;

async function req(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return res.json();
}

// Ambil semua uploads. fields: string kolom dipisah koma
export function fetchUploads({ fields, jenis, order = 'desc' } = {}) {
  const p = new URLSearchParams();
  if (jenis)  p.set('jenis',  jenis);
  if (order)  p.set('order',  order);
  if (fields) p.set('fields', fields);
  return req(`/api/uploads?${p}`);
}

// Insert satu upload, return { data: row, error }
export function insertUpload(payload) {
  return req('/api/uploads', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// Hapus upload (cascade hapus debitur), return { error }
export function deleteUpload(id) {
  return req(`/api/uploads/${id}`, { method: 'DELETE' });
}

// Ambil debitur by upload_id dengan pagination (from/to adalah row index inklusif)
export function fetchDebitur({ upload_id, from = 0, to = 999 }) {
  const p = new URLSearchParams({ upload_id, from, to });
  return req(`/api/debitur?${p}`);
}

// Bulk insert debitur, return { error }
export function bulkInsertDebitur(rows) {
  return req('/api/debitur/bulk', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ rows }),
  });
}

// ── CKPN ────────────────────────────────────────────────────────────────────

export function fetchCkpnSummary(upload_id) {
  return req(`/api/ckpn/summary?upload_id=${upload_id}`);
}

export function bulkInsertCkpn(rows) {
  return req('/api/ckpn/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
}

// ── Recovery PH ─────────────────────────────────────────────────────────────

export function fetchRecPhSummary(upload_id) {
  return req(`/api/rec-ph/summary?upload_id=${upload_id}`);
}

export function fetchCkpnTrend() {
  return req('/api/ckpn/trend');
}

export function fetchRecPhTrend() {
  return req('/api/rec-ph/trend');
}

export function bulkInsertRecPh(rows) {
  return req('/api/rec-ph/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
}

// ── Data Mantri (agregat per mantri per upload) ───────────────────────────────

export function fetchMantriAgg(upload_id) {
  return req(`/api/mantri/agg?upload_id=${upload_id}`);
}

export function fetchMantriAggCross(terkini_id, ref_ids) {
  return req(`/api/mantri/agg-cross?terkini_id=${terkini_id}&ref_ids=${ref_ids.join(',')}`);
}

// ── Action Plans ────────────────────────────────────────────────────────────

export function fetchActionPlans() {
  return req('/api/action-plans');
}

export function saveActionPlan(payload) {
  return req('/api/action-plans', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

export function updateActionPlan(id, { status, hasil }) {
  return req(`/api/action-plans/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status, hasil }),
  });
}

export function deleteActionPlan(id) {
  return req(`/api/action-plans/${id}`, { method: 'DELETE' });
}
