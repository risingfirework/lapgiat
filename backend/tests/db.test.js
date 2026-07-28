const test = require('node:test');
const assert = require('node:assert/strict');
const { JsonDB } = require('../config/db');

test('uses PostgreSQL storage when the env connection variables are present', () => {
  const db = new JsonDB('postgres_env_test');
  assert.equal(db.storageMode, 'postgres');
});

test('JsonDB stores and reads records through the configured storage backend', async () => {
  const db = new JsonDB('test_db_adapter');
  const recordId = 'db-test-record';

  await db.delete(recordId);
  const created = await db.create({ id: recordId, name: 'postgres-test', status: 'ok' });
  const found = await db.findById(recordId);

  assert.ok(created);
  assert.equal(found.name, 'postgres-test');
  assert.equal(found.status, 'ok');

  await db.delete(recordId);
});
