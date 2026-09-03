import { THRESHOLDS, ENV_NAME } from '../helpers/config.helper.js';

export const loadOptions = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '60s', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
      tags: { scenario: 'load' },
    },
  },
  thresholds: {
    http_req_duration: [`p(95)<${THRESHOLDS.p95}`],
    http_req_failed: [`rate<${THRESHOLDS.errorRate}`],
    custom_error_rate: [`rate<${THRESHOLDS.errorRate}`],
    checks: ['rate>0.95'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  tags: { testType: 'load', env: ENV_NAME },
};

export default loadOptions;
