const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createUploadsRouter, signUpload } = require('../src/routes/uploads');

async function postSign(config) {
  const app = express();
  app.use(express.json());
  app.use(createUploadsRouter(config));
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ error: { message: error.message } });
  });
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    return { response, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('signs the fixed Cloudinary upload folder using sorted parameters', () => {
  const actual = signUpload({ timestamp: 123456, folder: 'neco-insurance' }, 'test-secret');

  assert.equal(actual, signUpload({ folder: 'neco-insurance', timestamp: 123456 }, 'test-secret'));
  assert.match(actual, /^[a-f0-9]{40}$/);
});

test('returns signed upload credentials without exposing the API secret', async () => {
  const cloudinary = {
    cloudName: 'example-cloud',
    apiKey: 'example-key',
    apiSecret: 'server-only-secret'
  };
  const { response, body } = await postSign(cloudinary);

  assert.equal(response.status, 200);
  assert.equal(body.data.cloudName, cloudinary.cloudName);
  assert.equal(body.data.apiKey, cloudinary.apiKey);
  assert.equal(body.data.folder, 'neco-insurance');
  assert.equal(body.data.signature, signUpload({
    folder: body.data.folder,
    timestamp: body.data.timestamp
  }, cloudinary.apiSecret));
  assert.equal(JSON.stringify(body).includes(cloudinary.apiSecret), false);
});

test('reports missing Cloudinary configuration instead of issuing an upload signature', async () => {
  const { response, body } = await postSign(null);

  assert.equal(response.status, 503);
  assert.match(body.error.message, /Cloudinary credentials/);
});
