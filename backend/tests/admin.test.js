const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const seedData = require('../seeders/seed');

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2pN3cAAAAASUVORK5CYII=',
  'base64'
);

describe('--- TDD Suite 6: Admin User CRUD & Header Setting ---', () => {
  let adminToken;
  let pengurusToken;
  let createdUserId;

  before(async () => {
    await seedData();

    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminRes.body.data.token;

    const pengurusRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'pengurus', password: 'pengurus123' });
    pengurusToken = pengurusRes.body.data.token;
  });

  test('GET /api/v1/users - Super Admin can list users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  test('POST /api/v1/users - Super Admin can create user', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: `admin_test_${Date.now()}`,
        password: 'admin12345',
        nama: 'Admin Test User',
        role: 'KASATDIK'
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.id);

    createdUserId = res.body.data.id;
  });

  test('PATCH /api/v1/users/:id - Super Admin can update user', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nama: 'Admin Test User Updated',
        role: 'PENGURUS_DAERAH'
      });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.nama, 'Admin Test User Updated');
  });

  test('DELETE /api/v1/users/:id - Super Admin can delete user', async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
  });

  test('PUT /api/v1/settings/header - Pengurus cannot update header logo', async () => {
    const res = await request(app)
      .put('/api/v1/settings/header')
      .set('Authorization', `Bearer ${pengurusToken}`)
      .attach('headerLogo', ONE_PIXEL_PNG, 'logo-test.png');

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  test('PUT /api/v1/settings/header - Super Admin can update header logo', async () => {
    const res = await request(app)
      .put('/api/v1/settings/header')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('headerLogo', ONE_PIXEL_PNG, 'logo-test.png');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(res.body.data.logoUrl, /^\/uploads\//);
  });

  test('GET /api/v1/settings/header - Authenticated user can fetch header logo', async () => {
    const res = await request(app)
      .get('/api/v1/settings/header')
      .set('Authorization', `Bearer ${pengurusToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.key);
  });

  test('PUT /api/v1/settings/pdf-kop - Pengurus cannot update PDF kop', async () => {
    const res = await request(app)
      .put('/api/v1/settings/pdf-kop')
      .set('Authorization', `Bearer ${pengurusToken}`)
      .send({
        orgLine1: 'YAYASAN HANG TUAH',
        orgLine2: 'PENGURUS DAERAH JAKARTA',
        titleLine1: 'KEGIATAN HARIAN',
        titleLine2: 'LINGKUNGAN YHT',
        signatureTitle: 'Ketua',
        signatureName: 'Nama Ketua'
      });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  test('PUT /api/v1/settings/pdf-kop - Super Admin can update PDF kop', async () => {
    const res = await request(app)
      .put('/api/v1/settings/pdf-kop')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orgLine1: 'YAYASAN HANG TUAH TEST',
        orgLine2: 'PENGURUS DAERAH TEST',
        titleLine1: 'KEGIATAN TEST 1',
        titleLine2: 'KEGIATAN TEST 2',
        signatureTitle: 'Ketua Test',
        signatureName: 'Nama Test'
      });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.orgLine1, 'YAYASAN HANG TUAH TEST');
  });

  test('GET /api/v1/settings/pdf-kop - Authenticated user can fetch PDF kop', async () => {
    const res = await request(app)
      .get('/api/v1/settings/pdf-kop')
      .set('Authorization', `Bearer ${pengurusToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.orgLine1);
    assert.ok(res.body.data.signatureName);
  });
});
