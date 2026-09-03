const CONFIGS = {
  dev: JSON.parse(open('../config/dev.json')),
  qa: JSON.parse(open('../config/qa.json')),
};

const ENV = (__ENV.ENV || 'qa').toLowerCase();

if (!CONFIGS[ENV]) {
  throw new Error(`Unknown ENV "${ENV}". Use dev or qa.`);
}

export const config = CONFIGS[ENV];
export const BASE_URL = config.BASE_URL;
export const APP_TYPE = config.APP_TYPE;
export const ENV_NAME = config.env;
export const THRESHOLDS = config.thresholds;
