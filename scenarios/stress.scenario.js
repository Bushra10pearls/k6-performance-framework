import { ENV_NAME } from '../helpers/config.helper.js';

export const stressOptions = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 80 },
        { duration: '30s', target: 100 },
        { duration: '60s', target: 100 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '20s',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    custom_error_rate: [
      {
        threshold: 'rate<0.05',
        abortOnFail: true,
        delayAbortEval: '30s',
      },
    ],
    http_req_failed: [
      {
        threshold: 'rate<0.05',
        abortOnFail: true,
        delayAbortEval: '30s',
      },
    ],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.90'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  tags: { testType: 'stress', env: ENV_NAME },
};

export default stressOptions;
