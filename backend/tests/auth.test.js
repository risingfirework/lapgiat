const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const seedData = require('../seeders/seed');

describe('--- TDD Suite 1: Authentication Module ---', () => {
  before(async () => {
    await seedData();
  });

  test('POST /api/v1/auth/login - Valid credentials (Pengurus)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'pengurus', password: 'pengurus123' });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.role, 'PENGURUS_DAERAH');
  });

  test('POST /api/v1/auth/login - Invalid password (returns 401)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'pengurus', password: 'wrongpassword' });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('GET /api/v1/auth/me - Authenticated user profile', async () => {
    // Step 1: Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'kasatdik_tk1', password: 'kasatdik123' });

    const token = loginRes.body.data.token;

    // Step 2: Fetch profile
    const profileRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(profileRes.statusCode, 200);
    assert.strictEqual(profileRes.body.success, true);
    assert.strictEqual(profileRes.body.data.username, 'kasatdik_tk1');
    assert.strictEqual(profileRes.body.data.role, 'KASATDIK');
  });

  test('GET /api/v1/auth/me - Unauthorized without token (returns 401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });
});
