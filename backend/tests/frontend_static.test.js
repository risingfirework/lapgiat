const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');

describe('--- TDD Suite 5: Frontend Static Files & SPA Integration ---', () => {
  test('GET / - Serves index.html from frontend/public', async () => {
    const res = await request(app).get('/');
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.ok(res.text.includes('Sistem Lapgiat'));
    assert.ok(res.text.includes('YAYASAN HANG TUAH'));
  });

  test('GET /css/style.css - Serves CSS stylesheet from frontend/public/css', async () => {
    const res = await request(app).get('/css/style.css');
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /css/);
    assert.ok(res.text.includes(':root') || res.text.includes('body'));
  });

  test('GET /js/app.js - Serves JavaScript app file from frontend/public/js', async () => {
    const res = await request(app).get('/js/app.js');
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /javascript/);
    assert.ok(res.text.includes('API_BASE'));
    assert.ok(res.text.includes('handleLogin'));
  });

  test('GET /dashboard (SPA route) - Fallback to frontend/public/index.html', async () => {
    const res = await request(app).get('/dashboard');
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.ok(res.text.includes('index.html') || res.text.includes('Sistem Lapgiat'));
  });

  test('GET /api/v1/nonexistent - API 404 handler does NOT fallback to HTML', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Endpoint API tidak ditemukan.');
  });
});
