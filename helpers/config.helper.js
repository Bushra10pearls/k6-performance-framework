// helpers/config.helper.js
// Loads the right environment config based on the ENV variable passed to k6:
//   k6 run -e ENV=dev     tests/posts.test.js
//   k6 run -e ENV=staging tests/posts.test.js
//
// open() only works in k6's init context (module top level), so both files are
// read once at startup and the correct one is selected. Keeping the paths
// static also means k6 can bundle them reliably in CI.

const CONFIGS = {
  dev: JSON.parse(open('../config/dev.json')),
  staging: JSON.parse(open('../config/staging.json')),
};

const ENV = (__ENV.ENV || 'dev').toLowerCase();

if (!CONFIGS[ENV]) {
  throw new Error(
    `Unknown ENV "${ENV}". Valid values: ${Object.keys(CONFIGS).join(', ')}`
  );
}

export const config = CONFIGS[ENV];

// Individual exports so tests can do: import { BASE_URL } from '../helpers/config.helper.js'
export const BASE_URL = config.BASE_URL;
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || config.AUTH_TOKEN;
export const ENV_NAME = config.env;
export const THRESHOLDS = config.thresholds;
