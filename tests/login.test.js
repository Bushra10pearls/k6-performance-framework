// tests/login.test.js
// JSONPlaceholder has no real /login endpoint, so the flow is simulated the way
// a real one behaves: look the user up by credentials, verify the identity that
// comes back, then perform an authenticated write with the session token.
//
//   k6 run -e ENV=dev -e SCENARIO=load tests/login.test.js

import { check, group, sleep } from 'k6';
import { get, post, parseJson } from '../helpers/http.helper.js';
import { getUserForVU } from '../data/users.js';
import { getScenarioOptions } from '../scenarios/index.js';
import { buildSummary } from '../helpers/report.helper.js';
import { ENV_NAME, BASE_URL } from '../helpers/config.helper.js';

export const options = getScenarioOptions();

// Writes reports/<test>-<scenario>-<env>.html plus the normal console summary.
export const handleSummary = buildSummary('login');

export function setup() {
  console.log(`[login.test.js] env=${ENV_NAME} base=${BASE_URL}`);
  return { startedAt: new Date().toISOString() };
}

export default function () {
  // Data-driven: each VU gets its own user, no two VUs share credentials.
  const user = getUserForVU();

  group('login flow', function () {
    // --- 1. Authenticate -----------------------------------------------
    const authRes = get(`/users?username=${user.username}`, {
      name: 'POST /login (simulated)',
    });

    const account = parseJson(authRes);

    check(account, {
      'login: exactly one account returned': (a) => Array.isArray(a) && a.length === 1,
      'login: email matches fixture': (a) =>
        Array.isArray(a) && a.length === 1 && a[0].email === user.email,
      'login: account id matches fixture': (a) =>
        Array.isArray(a) && a.length === 1 && a[0].id === user.id,
    });

    if (!account || account.length !== 1) {
      return; // no session, nothing further to exercise
    }

    const session = { userId: account[0].id, name: account[0].name };
    sleep(1);

    // --- 2. Authenticated read ------------------------------------------
    const profileRes = get(`/users/${session.userId}`, {
      name: 'GET /users/{id} (profile)',
    });

    const profile = parseJson(profileRes);
    check(profile, {
      'profile: username matches session': (p) => p && p.username === user.username,
      'profile: has address block': (p) => p && p.address && !!p.address.city,
    });

    sleep(1);

    // --- 3. Authenticated write ------------------------------------------
    const writeRes = post(
      '/posts',
      {
        title: `session check for ${user.username}`,
        body: `VU ${__VU} iteration ${__ITER}`,
        userId: session.userId,
      },
      { name: 'POST /posts (authenticated write)' }
    );

    const created = parseJson(writeRes);
    check(created, {
      'write: server returned an id': (c) => c && typeof c.id === 'number',
      'write: userId echoed back': (c) => c && c.userId === session.userId,
    });
  });

  sleep(1);
}

export function teardown(data) {
  console.log(`[login.test.js] started at ${data.startedAt}, finished ${new Date().toISOString()}`);
}
