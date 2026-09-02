// scenarios/load.scenario.js
// "Normal traffic" profile: does the system hold its SLA under expected load?
// Ramp 0 -> 20 VUs over 30s, hold 20 VUs for 60s, ramp back down over 30s.

import { THRESHOLDS, ENV_NAME } from '../helpers/config.helper.js';

export const loadOptions = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // ramp up
        { duration: '60s', target: 20 }, // steady state
        { duration: '30s', target: 0 },  // ramp down
      ],
      gracefulRampDown: '15s',
      tags: { scenario: 'load' },
    },
  },

  thresholds: {
    // p95 latency budget comes from the env config (dev: 800ms, staging: 1200ms)
    http_req_duration: [`p(95)<${THRESHOLDS.p95}`],
    // Built-in failure rate
    http_req_failed: [`rate<${THRESHOLDS.errorRate}`],
    // Our own rate, which also counts failed checks (not just HTTP errors)
    custom_error_rate: [`rate<${THRESHOLDS.errorRate}`],
    // 95%+ of all checks must pass
    checks: ['rate>0.95'],
  },

  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  tags: { testType: 'load', env: ENV_NAME },
};

export default loadOptions;
