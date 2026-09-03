import { sleep } from 'k6';
import { login } from '../helpers/auth.helper.js';
import { getScenarioOptions } from '../scenarios/index.js';
import { buildSummary } from '../helpers/report.helper.js';
import { ENV_NAME, BASE_URL } from '../helpers/config.helper.js';

export const options = getScenarioOptions();
export const handleSummary = buildSummary('login');

export function setup() {
  console.log(`[login] env=${ENV_NAME} base=${BASE_URL}`);
}

export default function () {
  login();
  sleep(1);
}
