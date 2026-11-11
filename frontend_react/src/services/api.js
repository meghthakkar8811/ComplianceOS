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

export async function catalogSearch(assetType, query, options) {
  return apiFetch('/catalog/search', {
    method: 'POST',
    body: JSON.stringify({ assetType, query, options }),
  });
}

/**
 * Pages through a reference catalog (e.g. RoyaltyRate, GstRate, DmfRate, NmetRate, Mineral)
 * so callers never silently truncate at the backend's default page size.
 */
export async function catalogSearchAll(assetType, query = {}, options, pageSize = 100) {
  const allItems = [];
  let offset = 0;
  let totalCount = null;
  while (totalCount === null || offset < totalCount) {
    const res = await catalogSearch(
      assetType,
      { ...query, includeCount: true, page: { offset, limit: pageSize } },
      options
    );
    const items = res?.items || [];
    allItems.push(...items);
    totalCount = res?.totalCount ?? items.length;
    if (items.length < pageSize || items.length === 0) break;
    offset += items.length;
  }
  return { items: allItems, totalCount: allItems.length };
}

export async function catalogAggregate(assetType, query, options) {
  return apiFetch('/catalog/aggregate', {
    method: 'POST',
    body: JSON.stringify({ assetType, query, options }),
  });
}

/**
 * Generates (or re-fetches the already-generated) PDF invoice for a sale and triggers a file
 * download. Returns `{ required: false }` when the sale's nature never calls for an invoice
 * (the backend's `204` signal) instead of throwing, so the caller can show an informational
 * message rather than treating it as an error. A genuine error response throws, same as any
 * other `apiFetch`-based call.
 */
export async function downloadInvoice(mineId, saleId) {
  const res = await fetch(`${API}/mines/${mineId}/sales/${saleId}/invoice`, {
    method: 'POST',
    credentials: 'include',
  });
  if (res.status === 204) {
    return { required: false };
  }
  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      // Response wasn't JSON; fall through with a generic message.
    }
    throw new ApiError(res.status, body);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? match[1] : `invoice_${saleId}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { required: true };
}
