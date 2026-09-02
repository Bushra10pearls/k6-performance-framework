// tests/posts.test.js
// Exercises the posts resource: list -> read one -> read comments -> create.
//
//   k6 run -e ENV=dev -e SCENARIO=load tests/posts.test.js

import { check, group, sleep } from 'k6';
import { get, post, put, parseJson } from '../helpers/http.helper.js';
import { getUserForVU } from '../data/users.js';
import { getScenarioOptions } from '../scenarios/index.js';
import { buildSummary } from '../helpers/report.helper.js';
import { ENV_NAME, BASE_URL } from '../helpers/config.helper.js';

export const options = getScenarioOptions();

// Writes reports/<test>-<scenario>-<env>.html plus the normal console summary.
export const handleSummary = buildSummary('posts');

export function setup() {
  console.log(`[posts.test.js] env=${ENV_NAME} base=${BASE_URL}`);
}

export default function () {
  const user = getUserForVU();

  group('browse posts', function () {
    const listRes = get('/posts', { name: 'GET /posts (list)' });
    const posts = parseJson(listRes);

    check(posts, {
      'list: returns an array': (p) => Array.isArray(p),
      'list: contains 100 posts': (p) => Array.isArray(p) && p.length === 100,
      'list: first post has a title': (p) => Array.isArray(p) && !!p[0].title,
    });

    sleep(1);

    // Deterministic per-VU pick so the cache profile is realistic, not random noise.
    const postId = ((__VU - 1) % 100) + 1;

    const oneRes = get(`/posts/${postId}`, { name: 'GET /posts/{id}' });
    const onePost = parseJson(oneRes);

    check(onePost, {
      'detail: id matches requested': (p) => p && p.id === postId,
      'detail: body is non-empty': (p) => p && typeof p.body === 'string' && p.body.length > 0,
    });

    sleep(1);

    const commentsRes = get(`/posts/${postId}/comments`, {
      name: 'GET /posts/{id}/comments',
    });
    const comments = parseJson(commentsRes);

    check(comments, {
      'comments: returns an array': (c) => Array.isArray(c),
      'comments: all belong to the post': (c) =>
        Array.isArray(c) && c.every((item) => item.postId === postId),
    });
  });

  sleep(1);

  group('write posts', function () {
    const createRes = post(
      '/posts',
      {
        title: `k6 ${ENV_NAME} post by ${user.username}`,
        body: `Created by VU ${__VU} on iteration ${__ITER}.`,
        userId: user.id,
      },
      { name: 'POST /posts (create)' }
    );

    const created = parseJson(createRes);
    check(created, {
      'create: got an id back': (c) => c && typeof c.id === 'number',
      'create: title echoed back': (c) => c && c.title.indexOf(user.username) !== -1,
    });

    sleep(1);

    const updateRes = put(
      `/posts/${user.id}`,
      {
        id: user.id,
        title: 'updated by k6',
        body: 'updated body',
        userId: user.id,
      },
      { name: 'PUT /posts/{id} (update)' }
    );

    const updated = parseJson(updateRes);
    check(updated, {
      'update: title was applied': (u) => u && u.title === 'updated by k6',
    });
  });

  sleep(1);
}
