// scenarios/index.js
// Lets every test pick its execution profile from the command line:
//   k6 run -e SCENARIO=load   tests/posts.test.js
//   k6 run -e SCENARIO=stress tests/posts.test.js
//   k6 run -e SCENARIO=smoke  tests/posts.test.js   (quick 1-VU sanity check)

import { loadOptions } from './load.scenario.js';
import { stressOptions } from './stress.scenario.js';
import { ENV_NAME } from '../helpers/config.helper.js';

const smokeOptions = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 3,
      maxDuration: '30s',
      tags: { scenario: 'smoke' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  tags: { testType: 'smoke', env: ENV_NAME },
};

const PROFILES = {
  load: loadOptions,
  stress: stressOptions,
  smoke: smokeOptions,
};

export function getScenarioOptions() {
  const name = (__ENV.SCENARIO || 'load').toLowerCase();
  const profile = PROFILES[name];

  if (!profile) {
    throw new Error(
      `Unknown SCENARIO "${name}". Valid values: ${Object.keys(PROFILES).join(', ')}`
    );
  }
  return profile;
}
