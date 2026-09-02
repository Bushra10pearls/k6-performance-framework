// scenarios/stress.scenario.js
// "Where does it break?" profile: climb to 100 VUs in steps.
//
// Finding the breaking point:
//   abortOnFail stops the run the moment the error rate crosses 5%, and
//   delayAbortEval gives the first 30s enough samples so a single early blip
//   doesn't abort the test. The stage that was running when k6 aborts IS the
//   breaking point — read it off the console output / summary.
//
// k6 exits with code 99 when a threshold is breached, which is what makes the
// Jenkins build fail.

import { ENV_NAME } from '../helpers/config.helper.js';

export const stressOptions = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // warm up
        { duration: '30s', target: 50 },  // above normal load
        { duration: '30s', target: 80 },  // pushing
        { duration: '30s', target: 100 }, // target peak
        { duration: '60s', target: 100 }, // hold at peak
        { duration: '30s', target: 0 },   // recovery
      ],
      gracefulRampDown: '20s',
      tags: { scenario: 'stress' },
    },
  },

  thresholds: {
    // The breaking-point detector: abort as soon as >5% of requests fail.
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
    // Latency is allowed to degrade under stress, but not without limit.
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.90'],
  },

  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  tags: { testType: 'stress', env: ENV_NAME },
};

export default stressOptions;
