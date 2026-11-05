const test = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../src/app');

const config = {
  nodeEnv: 'development',
  corsOrigins: ['http://localhost:5173'],
  rateLimitWindowMs: 60_000,
  rateLimitMax: 100,
  jwtSecret: 'test-secret-with-more-than-thirty-two-characters',
  jwtExpiresIn: '1d',
  cookieSecure: false,
  cookieSameSite: 'lax'
};

async function postLogin(appConfig, origin) {
  const server = createApp(appConfig).listen(0);
  try {
    const { port } = server.address();
    const requestOrigin = origin === 'same-origin'
      ? `http://127.0.0.1:${port}`
      : origin;
    return await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: requestOrigin },
      body: '{}'
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('allows localhost dev-server fallback ports for sign-in', async () => {
  const response = await postLogin(config, 'http://localhost:5174');

  assert.equal(response.status, 400);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5174');
});

test('allows private LAN origins during development', async () => {
  const response = await postLogin(config, 'http://192.168.137.1:5174');

  assert.equal(response.status, 400);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://192.168.137.1:5174');
});

test('does not allow public IP origins during development', async () => {
  const response = await postLogin(config, 'http://8.8.8.8:5174');

  assert.equal(response.status, 403);
});

test('does not allow unconfigured origins in production', async () => {
  const response = await postLogin({ ...config, nodeEnv: 'production' }, 'http://192.168.137.1:5174');

  assert.equal(response.status, 403);
});

test('allows same-origin production writes without a configured CORS origin', async () => {
  const response = await postLogin({ ...config, nodeEnv: 'production', corsOrigins: [] }, 'same-origin');

  assert.equal(response.status, 400);
});

test('trusts the production proxy hop but not forwarded headers in development', () => {
  assert.equal(createApp(config).get('trust proxy'), false);
  assert.equal(createApp({ ...config, nodeEnv: 'production' }).get('trust proxy'), 1);
});
