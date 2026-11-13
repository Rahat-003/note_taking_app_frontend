const TOKEN_KEY = 'token';
let onUnauthorized = () => {};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
/** fn(error) runs when a signed-in request gets 401; error.code says why (TOKEN_EXPIRED, ACCOUNT_DISABLED, ...). */
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

/**
 * A failed API call. The API answers errors as { error, code, permission?, fields? }:
 * code is e.g. VALIDATION_FAILED, PERMISSION_DENIED, NOT_FOUND; fields lists [{ field, messages }].
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'ERROR', permission, fields = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.permission = permission;
    this.fields = fields;
  }
}

const STATUS_CODES = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED' };

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('The server could not be reached. Check your connection and try again.', { code: 'NETWORK' });
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new ApiError(data.error || res.statusText || 'Request failed', {
      status: res.status,
      code: data.code || STATUS_CODES[res.status] || (res.status >= 500 ? 'INTERNAL' : 'ERROR'),
      permission: data.permission,
      fields: Array.isArray(data.fields) ? data.fields : [],
    });
    // A signed-in request refused with 401: the session is over (expired token, deactivated or deleted account).
    if (res.status === 401 && token) onUnauthorized(error);
    throw error;
  }
  return data;
}

export const splitList = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
export const fmtDate = (d) => new Date(d).toLocaleString();
