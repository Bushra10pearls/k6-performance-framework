import { check, sleep } from 'k6';
import { get, parseJson } from '../helpers/http.helper.js';
import { requireAccessToken } from '../helpers/auth.helper.js';
import { getVinForVU } from '../data/vins.js';
import { getScenarioOptions } from '../scenarios/index.js';
import { buildSummary } from '../helpers/report.helper.js';
import { ENV_NAME, BASE_URL } from '../helpers/config.helper.js';

export const options = getScenarioOptions();
export const handleSummary = buildSummary('sensor-readings');
let failureLogCount = 0;
export function setup() {
  console.log(`[sensor-readings] env=${ENV_NAME} base=${BASE_URL}`);
  return { accessToken: requireAccessToken() };
}

function describeShape(value) {
  if (Array.isArray(value)) return `array(length=${value.length})`;
  if (!value || typeof value !== 'object') return typeof value;

  const keys = Object.keys(value);
  const nestedArrays = keys
    .filter((key) => Array.isArray(value[key]))
    .map((key) => `${key}(length=${value[key].length})`);

  return `keys=[${keys.join(', ')}]${nestedArrays.length ? ` arrays=[${nestedArrays.join(', ')}]` : ''}`;
}

export default function (data) {
  const vin = getVinForVU();

  const response = get(`/api/sensor-readings/device/${encodeURIComponent(vin)}/latest`, {
    name: 'GET /api/sensor-readings/device/{vin}/latest',
    token: data.accessToken,
  });
 if (response.status !== 200 && __VU === 1 && failureLogCount < 5) {
    console.log(`[FAILED REQUEST] status=${response.status}`);
    console.log(`[FAILED BODY] ${String(response.body).replace(/\s+/g, ' ').slice(0, 300)}`);
    failureLogCount++;
}

  const body = parseJson(response);

  check(body, {
    'sensor readings: response is valid JSON': (value) => value !== null,
    'sensor readings: response contains data': (value) => {
      if (Array.isArray(value)) return value.length > 0;
      return !!value && typeof value === 'object' && Object.keys(value).length > 0;
    },
  });

  if (__VU === 1 && __ITER === 0) {
    console.log(`[sensor-readings] response shape: ${describeShape(body)}`);
  }

  sleep(1);
}
