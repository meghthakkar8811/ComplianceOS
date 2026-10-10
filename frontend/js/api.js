'use strict';

// ═══════════════════════════════════════════════════════════
// API — thin wrapper around the Java backend's REST surface.
// Auth is a cookie-based session (Set-Cookie on /v1/auth/login), never a
// bearer token, and every endpoint returns its raw body with a real HTTP
// status code — there is no {success, data|error} envelope to unwrap.
// ═══════════════════════════════════════════════════════════

// Matches dev.sh, which port-forwards the backend to localhost:8080 and serves this
// frontend on localhost:3000 — the origin the backend's local CORS tier already allows.
// Change this if you're pointing at a different backend (e.g. same-origin in production: '').
const API_ORIGIN = 'http://localhost:8080';
const API = API_ORIGIN + '/v1';

class ApiError extends Error {
  constructor(status, body) {
    super(typeof body === 'string' ? body : (body && body.message) || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Calls a JSON endpoint. Throws ApiError on any non-2xx response (including 401 — callers that
 * need to redirect to login on 401 should catch it and check err.status themselves).
 */
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  return readJsonOrThrow(res);
}

/** Raw-body upload to /v1/storage/upload — not multipart. Returns the saved FileDetails. */
async function apiUpload(file, name) {
  const res = await fetch(`${API}/storage/upload?name=${encodeURIComponent(name || file.name)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  return readJsonOrThrow(res);
}

/** POSTs to /v1/catalog/search for a full-bean listing of {assetType}, returns PaginatedResult. */
async function catalogSearch(assetType, query) {
  return apiFetch('/catalog/search', {
    method: 'POST',
    body: JSON.stringify({ assetType, query }),
  });
}

async function readJsonOrThrow(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}
