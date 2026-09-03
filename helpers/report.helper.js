import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { ENV_NAME } from './config.helper.js';

export function buildSummary(testName) {
  return function handleSummary(data) {
    const scenario = (__ENV.SCENARIO || 'smoke').toLowerCase();
    const dir = __ENV.REPORT_DIR || 'reports';
    const base = `${dir}/${testName}-${scenario}-${ENV_NAME}`;

    return {
      [`${base}.html`]: htmlReport(data, {
        title: `${testName} - ${scenario} - ${ENV_NAME}`,
      }),
      [`${base}.json`]: JSON.stringify(data, null, 2),
      stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
  };
}
