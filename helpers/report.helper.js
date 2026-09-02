// helpers/report.helper.js
// Third-party HTML reporting, in one place so the three test files don't each
// carry a copy-pasted handleSummary().
//
//   htmlReport  -> benc-uk/k6-reporter, renders a standalone HTML dashboard
//   textSummary -> k6's own jslib, restores the normal console summary
//
// Defining handleSummary() SUPPRESSES k6's default end-of-test console output,
// which is why textSummary is piped back to stdout. Without it your terminal
// screenshot would be empty.
//
// Both imports are remote URLs. k6 downloads and caches them on first run, so
// the very first execution needs internet access.

import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { ENV_NAME } from './config.helper.js';

/**
 * Builds a handleSummary() for one test file.
 *
 * File names include the test, scenario and environment, so a load run and a
 * stress run don't overwrite each other:
 *   reports/posts-load-dev.html
 *   reports/posts-stress-dev.html
 *
 * run.sh sets REPORT_DIR to a timestamped folder; running k6 directly falls
 * back to plain ./reports.
 *
 * @param {string} testName  e.g. 'posts'
 */
export function buildSummary(testName) {
  return function handleSummary(data) {
    const scenario = (__ENV.SCENARIO || 'load').toLowerCase();
    const dir = __ENV.REPORT_DIR || 'reports';
    const base = `${dir}/${testName}-${scenario}-${ENV_NAME}`;

    return {
      // 1. The third-party HTML dashboard
      [`${base}.html`]: htmlReport(data, {
        title: `${testName} — ${scenario} — ${ENV_NAME} — ${new Date().toISOString()}`,
      }),

      // 2. Machine-readable summary for CI trending
      [`${base}.json`]: JSON.stringify(data, null, 2),

      // 3. The normal terminal output (this is your screenshot)
      stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
  };
}
