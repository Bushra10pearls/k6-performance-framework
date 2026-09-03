import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { APP_TYPE, BASE_URL, config } from './config.helper.js';

export const errorRate = new Rate('custom_error_rate');
export const requestDuration = new Trend('custom_request_duration', true);
export const requestCount = new Counter('custom_request_count');

export function buildHeaders(token = null, extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-app-type': APP_TYPE,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return Object.assign(headers, extra);
}

function buildUrl(path) {
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function record(res, name, expectedStatus) {
  const passed = check(res, {
    [`${name}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name}: body is not empty`]: (r) => !!r.body && r.body.length > 0,
    [`${name}: responded under 2s`]: (r) => r.timings.duration < 2000,
  });

  errorRate.add(!passed, { endpoint: name });
  requestDuration.add(res.timings.duration, { endpoint: name });
  requestCount.add(1, { endpoint: name });

  return passed;
}

export function get(path, options = {}) {
  const name = options.name || path;
  const expectedStatus = options.expectedStatus || 200;

  const res = http.get(buildUrl(path), {
    headers: buildHeaders(options.token, options.headers),
    timeout: config.timeout,
    tags: Object.assign({ name, method: 'GET' }, options.tags),
  });

  record(res, name, expectedStatus);
  return res;
}

export function post(path, payload = {}, options = {}) {
  const name = options.name || path;
  const expectedStatus = options.expectedStatus || 200;
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  const res = http.post(buildUrl(path), body, {
    headers: buildHeaders(options.token, options.headers),
    timeout: config.timeout,
    tags: Object.assign({ name, method: 'POST' }, options.tags),
  });

  record(res, name, expectedStatus);
  return res;
}

export function parseJson(res) {
  try {
    return res.json();
  } catch (_) {
    return null;
  }
}
