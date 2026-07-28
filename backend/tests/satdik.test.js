const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const seedData = require('../seeders/seed');

describe('--- TDD Suite 2: Master Satdik Module ---', () => {
  let adminToken;
  let kasatdikToken;

  before(async () => {
    await seedData();

    // Login Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminRes.body.data.token;

    // Login Kasatdik
    const kasatdikRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'kasatdik_tk1', password: 'kasatdik123' });
    kasatdikToken = kasatdikRes.body.data.token;
  });

  test('GET /api/v1/satdik - Fetch all Satdik list', async () => {
    const res = await request(app)
      .get('/api/v1/satdik')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 28);
  });

  test('GET /api/v1/satdik?jenjang=TK - Filter by jenjang TK', async () => {
    const res = await request(app)
      .get('/api/v1/satdik?jenjang=TK')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.data.every(s => s.jenjang === 'TK'));
  });

  test('POST /api/v1/satdik - Create Satdik as Super Admin', async () => {
    const res = await request(app)
      .post('/api/v1/satdik')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        kodeSatdik: 'TK-99-TEST',
        nama: 'TK Hang Tuah Test Unit',
        jenjang: 'TK',
        alamat: 'Jl. Test No. 99'
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.data.kodeSatdik, 'TK-99-TEST');
  });

  test('POST /api/v1/satdik - Kasatdik cannot create Satdik (RBAC 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/satdik')
      .set('Authorization', `Bearer ${kasatdikToken}`)
      .send({
        kodeSatdik: 'TK-100-FAIL',
        nama: 'TK Hang Tuah Fail',
        jenjang: 'TK'
      });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });
});
