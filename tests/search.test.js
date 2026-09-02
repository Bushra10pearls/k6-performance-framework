// tests/search.test.js
// Query-parameter heavy traffic: filtering posts, comments and users.
// This is usually the slowest read path in a real API, which makes it the
// interesting one to watch during the stress run.
//
//   k6 run -e ENV=dev -e SCENARIO=stress tests/search.test.js

import { check, group, sleep } from 'k6';
import { get, parseJson } from '../helpers/http.helper.js';
import { getUserForVU } from '../data/users.js';
import { getScenarioOptions } from '../scenarios/index.js';
import { buildSummary } from '../helpers/report.helper.js';
import { ENV_NAME, BASE_URL } from '../helpers/config.helper.js';

export const options = getScenarioOptions();

// Writes reports/<test>-<scenario>-<env>.html plus the normal console summary.
export const handleSummary = buildSummary('search');

export function setup() {
  console.log(`[search.test.js] env=${ENV_NAME} base=${BASE_URL}`);
}

export default function () {
  const user = getUserForVU();

  group('search posts by author', function () {
    const res = get(`/posts?userId=${user.id}`, { name: 'GET /posts?userId' });
    const posts = parseJson(res);

    check(posts, {
      'by-author: returns an array': (p) => Array.isArray(p),
      'by-author: every post belongs to the user': (p) =>
        Array.isArray(p) && p.every((item) => item.userId === user.id),
      'by-author: returns 10 posts': (p) => Array.isArray(p) && p.length === 10,
    });
  });

  sleep(1);

  group('search comments by email', function () {
    const res = get(`/comments?email=${encodeURIComponent(user.email)}`, {
      name: 'GET /comments?email',
    });
    const comments = parseJson(res);

    // A zero-length result is a valid answer for a filter query — what matters
    // is that the API answered correctly and quickly.
    check(comments, {
      'by-email: returns an array': (c) => Array.isArray(c),
      'by-email: responded under 1.5s': () => res.timings.duration < 1500,
    });
  });

  sleep(1);

  group('keyword search', function () {
    // JSONPlaceholder has no full-text endpoint, so fetch and filter client-side.
    const res = get('/posts', { name: 'GET /posts (keyword search)' });
    const posts = parseJson(res) || [];

    const term = user.searchTerm.split(' ')[0].toLowerCase();
    const matches = posts.filter(
      (p) =>
        p.title.toLowerCase().indexOf(term) !== -1 ||
        p.body.toLowerCase().indexOf(term) !== -1
    );

    check(matches, {
      'keyword: search executed over a full result set': () => posts.length === 100,
      'keyword: results are well formed': (m) => m.every((p) => typeof p.id === 'number'),
    });
  });

  sleep(1);

  group('search users', function () {
    const res = get(`/users?username=${user.username}`, { name: 'GET /users?username' });
    const found = parseJson(res);

    check(found, {
      'users: exactly one match': (u) => Array.isArray(u) && u.length === 1,
      'users: company info present': (u) =>
        Array.isArray(u) && u.length === 1 && !!u[0].company.name,
    });
  });

  sleep(1);
}
