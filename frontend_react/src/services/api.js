// ComplianceOS React API Service Layer
// Direct 1:1 migration of frontend/js/api.js preserving cookie-based auth and raw body contracts

const LOCAL_ORIGIN = 'http://localhost:8080';
const REMOTE_ORIGIN = 'https://agentengine.duckdns.org';

const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const API_ORIGIN = (typeof window !== 'undefined' && window.API_ORIGIN_OVERRIDE) 
  ? window.API_ORIGIN_OVERRIDE 
  : (isLocalhost ? (window.location.port === '3001' ? '' : LOCAL_ORIGIN) : REMOTE_ORIGIN);

export const API = (API_ORIGIN ? API_ORIGIN : '') + '/v1';

export class ApiError extends Error {
  constructor(status, body) {
    super(typeof body === 'string' ? body : (body && body.message) || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function readJsonOrThrow(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

export async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  return readJsonOrThrow(res);
}

export async function apiUpload(file, name) {
  const res = await fetch(`${API}/storage/upload?name=${encodeURIComponent(name || file.name)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  return readJsonOrThrow(res);
}

export async function apiDownload(attachment) {
  const res = await fetch(`${API}/storage/download`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attachment),
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export async function catalogSearch(assetType, query) {
  return apiFetch('/catalog/search', {
    method: 'POST',
    body: JSON.stringify({ assetType, query }),
  });
}
