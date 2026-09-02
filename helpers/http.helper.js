// helpers/http.helper.js
// The single place where HTTP calls are made. Tests never import k6/http
// directly — they call get()/post() from here, so auth headers, timeouts,
// checks and error accounting stay consistent across every script.

import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, AUTH_TOKEN, config } from './config.helper.js';

// ---------------------------------------------------------------------------
// Custom metrics (importable by tests/scenarios for thresholds)
// ---------------------------------------------------------------------------
export const errorRate = new Rate('custom_error_rate');
export const requestDuration = new Trend('custom_request_duration', true);
export const requestCount = new Counter('custom_request_count');

// ---------------------------------------------------------------------------
// Header building
// ---------------------------------------------------------------------------
export function buildHeaders(extra = {}) {
  return Object.assign(
    {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'X-Test-Env': config.env,
    },
    extra
  );
}

function buildUrl(path) {
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

// ---------------------------------------------------------------------------
// Shared response validation + metric recording
// ---------------------------------------------------------------------------
function record(res, name, expectedStatus) {
  const passed = check(res, {
    [`${name}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name}: body is not empty`]: (r) => r.body && r.body.length > 0,
    [`${name}: responded under 2s`]: (r) => r.timings.duration < 2000,
  });

  errorRate.add(!passed, { endpoint: name });
  requestDuration.add(res.timings.duration, { endpoint: name });
  requestCount.add(1, { endpoint: name });

  return passed;
}

// ---------------------------------------------------------------------------
// Public verbs
// ---------------------------------------------------------------------------

/**
 * @param {string} path      e.g. '/posts/1' or '/posts?userId=3'
 * @param {object} options   { name, expectedStatus, headers, tags }
 */
export function get(path, options = {}) {
  const name = options.name || path;
  const expectedStatus = options.expectedStatus || 200;

  const res = http.get(buildUrl(path), {
    headers: buildHeaders(options.headers),
    timeout: config.timeout,
    tags: Object.assign({ name, method: 'GET' }, options.tags),
  });

  record(res, name, expectedStatus);
  return res;
}

/**
 * @param {string} path
 * @param {object|string} payload  object is JSON-stringified automatically
 * @param {object} options         { name, expectedStatus, headers, tags }
 */
export function post(path, payload = {}, options = {}) {
  const name = options.name || path;
  const expectedStatus = options.expectedStatus || 201;
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  const res = http.post(buildUrl(path), body, {
    headers: buildHeaders(options.headers),
    timeout: config.timeout,
    tags: Object.assign({ name, method: 'POST' }, options.tags),
  });

  record(res, name, expectedStatus);
  return res;
}

export function put(path, payload = {}, options = {}) {
  const name = options.name || path;
  const expectedStatus = options.expectedStatus || 200;
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  const res = http.put(buildUrl(path), body, {
    headers: buildHeaders(options.headers),
    timeout: config.timeout,
    tags: Object.assign({ name, method: 'PUT' }, options.tags),
  });

  record(res, name, expectedStatus);
  return res;
}

export function del(path, options = {}) {
  const name = options.name || path;
  const expectedStatus = options.expectedStatus || 200;

  const res = http.del(buildUrl(path), null, {
    headers: buildHeaders(options.headers),
    timeout: config.timeout,
    tags: Object.assign({ name, method: 'DELETE' }, options.tags),
  });

  record(res, name, expectedStatus);
  return res;
}

/** Safe JSON parse — jsonplaceholder occasionally returns HTML on rate limits. */
export function parseJson(res) {
  try {
    return res.json();
  } catch (e) {
    return null;
  }
}
