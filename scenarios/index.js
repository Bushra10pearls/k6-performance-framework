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
  smoke: smokeOptions,
  load: loadOptions,
  stress: stressOptions,
};

export function getScenarioOptions() {
  const name = (__ENV.SCENARIO || 'smoke').toLowerCase();
  const profile = PROFILES[name];

  if (!profile) {
    throw new Error(`Unknown SCENARIO "${name}". Use smoke, load or stress.`);
  }

  return profile;
}
