const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const seedData = require('../seeders/seed');

describe('--- TDD Suite 3: Lapgiat Workflow & Approval Module ---', () => {
  let pengurusToken;
  let kasatdikToken;
  let createdLapgiatId;

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

  test('POST /api/v1/lapgiat - Submit new Lapgiat as Kasatdik', async () => {
    const res = await request(app)
      .post('/api/v1/lapgiat')
      .set('Authorization', `Bearer ${kasatdikToken}`)
      .field('tanggalKegiatan', '2026-06-25')
      .field('uraianKegiatan', 'Latihan Marching Band dan Pembiasaan Keagamaan')
      .field('keteranganPeserta', 'Diikuti oleh Murid Kelompok B');

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'SUBMITTED');
    assert.ok(res.body.data.id);

    createdLapgiatId = res.body.data.id;
  });

  test('GET /api/v1/lapgiat - Filter by date 2026-06-25', async () => {
    const res = await request(app)
      .get('/api/v1/lapgiat?tanggal=2026-06-25')
      .set('Authorization', `Bearer ${pengurusToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.data.some(l => l.id === createdLapgiatId));
  });

  test('PATCH /api/v1/lapgiat/:id/status - Approve Lapgiat as Pengurus', async () => {
    const res = await request(app)
      .patch(`/api/v1/lapgiat/${createdLapgiatId}/status`)
      .set('Authorization', `Bearer ${pengurusToken}`)
      .send({
        status: 'APPROVED',
        notes: 'Disetujui oleh Pengurus Daerah.'
      });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.status, 'APPROVED');
  });

  test('PATCH /api/v1/lapgiat/:id/status - Kasatdik cannot change status (RBAC 403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/lapgiat/${createdLapgiatId}/status`)
      .set('Authorization', `Bearer ${kasatdikToken}`)
      .send({
        status: 'APPROVED'
      });

    assert.strictEqual(res.statusCode, 403);
  });
});
