import { check } from 'k6';
import { post, parseJson } from './http.helper.js';

function getCredentials() {
  const email = __ENV.RT_EMAIL;
  const password = __ENV.RT_PASSWORD;

  if (!email || !password) {
    throw new Error('RT_EMAIL and RT_PASSWORD are required.');
  }

  return { email, password };
}

export function login() {
  const { email, password } = getCredentials();

  const response = post(
    '/api/auth/login',
    {
      email,
      password,
      rememberMe: true,
    },
    {
      name: 'POST /api/auth/login',
      expectedStatus: 200,
    }
  );

  const body = parseJson(response);
  const accessToken = body?.accessToken || null;

  check(body, {
    'login: response is valid JSON': (value) => !!value && typeof value === 'object',
    'login: access token is available': () => !!accessToken,
  });

  return { response, body, accessToken };
}

export function requireAccessToken() {
  const result = login();

  if (!result.accessToken) {
    throw new Error('Login succeeded but accessToken was not found in the response.');
  }

  return result.accessToken;
}
