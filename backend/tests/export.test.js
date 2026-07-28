const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const seedData = require('../seeders/seed');

describe('--- TDD Suite 4: Export PDF/Excel Module ---', () => {
  let pengurusToken;
  let kasatdikToken;

  before(async () => {
    await seedData();

    // Login Pengurus
    const pengurusRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'pengurus', password: 'pengurus123' });
    pengurusToken = pengurusRes.body.data.token;

    // Login Kasatdik
    const kasatdikRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'kasatdik_tk1', password: 'kasatdik123' });
    kasatdikToken = kasatdikRes.body.data.token;
  });

  test('GET /api/v1/export/pdf - Export PDF as Pengurus', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf?tanggal=2026-06-24')
      .set('Authorization', `Bearer ${pengurusToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert.ok(res.body.length > 0);
  });

  test('GET /api/v1/export/excel - Export Excel/JSON as Pengurus', async () => {
    const res = await request(app)
      .get('/api/v1/export/excel?tanggal=2026-06-24')
      .set('Authorization', `Bearer ${pengurusToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  test('GET /api/v1/export/pdf - Kasatdik cannot export PDF (RBAC 403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/export/pdf')
      .set('Authorization', `Bearer ${kasatdikToken}`);

    assert.strictEqual(res.statusCode, 403);
  });
});
