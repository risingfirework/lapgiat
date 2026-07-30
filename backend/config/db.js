const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, '../data');
const KNOWN_TABLES = new Set(['academic_years', 'satdik', 'users', 'lapgiat', 'lapgiat_media']);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

for (const envPath of [path.resolve(__dirname, '../.env'), path.resolve(__dirname, '../../.env')]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const hasPgConfig = Boolean(process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD);
let pool = null;
let schemaReadyPromise = null;
let storageMode = hasPgConfig ? 'postgres' : 'json';

function getPoolConfig() {
  return {
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT || 5432),
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined
  };
}

async function ensurePostgresConnection() {
  if (pool) {
    return pool;
  }

  if (!hasPgConfig) {
    storageMode = 'json';
    return null;
  }

  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      pool = new Pool(getPoolConfig());
      await pool.query(`
        CREATE TABLE IF NOT EXISTS academic_years (
          id TEXT PRIMARY KEY,
          year TEXT NOT NULL,
          is_current BOOLEAN DEFAULT FALSE,
          updated_by TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS satdik (
          id TEXT PRIMARY KEY,
          kode_satdik TEXT NOT NULL UNIQUE,
          nama TEXT NOT NULL,
          jenjang TEXT NOT NULL,
          alamat TEXT DEFAULT '',
          order_index INTEGER DEFAULT 0,
          parent_id TEXT REFERENCES satdik(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          nama TEXT NOT NULL,
          role TEXT NOT NULL,
          satdik_id TEXT REFERENCES satdik(id),
          parent_id TEXT REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lapgiat (
          id TEXT PRIMARY KEY,
          satdik_id TEXT REFERENCES satdik(id) NOT NULL,
          tanggal_kegiatan TEXT NOT NULL,
          uraian_kegiatan TEXT NOT NULL,
          keterangan_peserta TEXT DEFAULT '',
          status TEXT NOT NULL,
          notes TEXT DEFAULT '',
          created_by TEXT REFERENCES users(id),
          approved_by TEXT REFERENCES users(id),
          approved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lapgiat_media (
          id TEXT PRIMARY KEY,
          lapgiat_id TEXT REFERENCES lapgiat(id) NOT NULL,
          file_name TEXT NOT NULL,
          original_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER DEFAULT 0,
          path TEXT NOT NULL,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_satdik_parent ON satdik(parent_id);
        CREATE INDEX IF NOT EXISTS idx_users_satdik ON users(satdik_id);
        CREATE INDEX IF NOT EXISTS idx_lapgiat_satdik ON lapgiat(satdik_id);
        CREATE INDEX IF NOT EXISTS idx_lapgiat_media_lapgiat ON lapgiat_media(lapgiat_id);

        -- Migrasi kompatibel untuk database yang dibuat sebelum menu tahun ajaran tersedia.
        ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS updated_by TEXT;
        CREATE INDEX IF NOT EXISTS idx_academic_years_current ON academic_years(is_current);
      `);

      storageMode = 'postgres';
      return pool;
    })().catch((err) => {
      schemaReadyPromise = null;
      storageMode = 'json';
      throw err;
    });
  }

  return schemaReadyPromise;
}

ensurePostgresConnection().catch((err) => {
  console.warn('[DB] PostgreSQL unavailable, falling back to JSON storage:', err.message);
});

function camelToSnake(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function snakeToCamel(value) {
  return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

class SqlDB {
  constructor(tableName, options = {}) {
    this.tableName = tableName;
    this.optionMap = options.columnMap || {};
    this.storageMode = hasPgConfig ? 'postgres' : 'json';
    this.useGenericTable = !KNOWN_TABLES.has(tableName);
    this.safeTableName = String(tableName).replace(/[^a-zA-Z0-9_]/g, '_');
    this.filePath = path.join(DATA_DIR, `${tableName}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  _toDbRecord(data) {
    const result = {};
    Object.entries(data || {}).forEach(([key, value]) => {
      if (value === undefined) return;
      const dbKey = this.optionMap[key] || camelToSnake(key);
      result[dbKey] = value;
    });
    return result;
  }

  _fromDbRecord(row) {
    const result = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      result[snakeToCamel(key)] = value;
    });
    return result;
  }

  _readFromFile() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data || '[]');
    } catch (err) {
      return [];
    }
  }

  _writeToFile(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  _normalizeItem(item, fallbackId = null) {
    const id = item && item.id ? String(item.id) : fallbackId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      ...item,
      id,
      createdAt: item && item.createdAt ? item.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async _ensureGenericTable() {
    const client = await ensurePostgresConnection();
    if (!client || !this.useGenericTable) {
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${this.safeTableName} (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }

  async _readFromPostgres() {
    const client = await ensurePostgresConnection();
    if (!client) {
      return this._readFromFile();
    }

    if (this.useGenericTable) {
      await this._ensureGenericTable();
      const result = await client.query(`SELECT id, data, created_at, updated_at FROM ${this.safeTableName} ORDER BY created_at DESC, id DESC`);
      return result.rows.map(row => ({
        ...(row.data || {}),
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }

    const result = await client.query(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC, id DESC`);
    return result.rows.map(row => this._fromDbRecord(row));
  }

  async _writeToPostgres(data) {
    const client = await ensurePostgresConnection();
    if (!client) {
      this._writeToFile(data);
      return;
    }

    if (this.useGenericTable) {
      await this._ensureGenericTable();
      await client.query(`DELETE FROM ${this.safeTableName}`);
      for (const item of data) {
        const normalized = this._normalizeItem(item);
        await client.query(`INSERT INTO ${this.safeTableName} (id, data, created_at, updated_at) VALUES ($1, $2, $3, $4)`, [normalized.id, JSON.stringify(normalized), normalized.createdAt, normalized.updatedAt]);
      }
      return;
    }

    await client.query(`DELETE FROM ${this.tableName}`);
    for (const item of data) {
      const record = this._toDbRecord(item);
      const columns = Object.keys(record);
      const values = Object.values(record);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      await client.query(query, values);
    }
  }

  async find(queryFn = () => true) {
    const data = await this._readFromPostgres();
    return data.filter(queryFn);
  }

  async findOne(queryFn) {
    const data = await this._readFromPostgres();
    return data.find(queryFn) || null;
  }

  async findById(id) {
    const client = await ensurePostgresConnection();
    if (!client) {
      const data = this._readFromFile();
      return data.find(item => String(item.id) === String(id)) || null;
    }

    if (this.useGenericTable) {
      await this._ensureGenericTable();
      const result = await client.query(`SELECT id, data, created_at, updated_at FROM ${this.safeTableName} WHERE id = $1`, [String(id)]);
      return result.rows.length > 0 ? {
        ...(result.rows[0].data || {}),
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      } : null;
    }

    const result = await client.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [String(id)]);
    return result.rows.length > 0 ? this._fromDbRecord(result.rows[0]) : null;
  }

  async create(newItem) {
    const client = await ensurePostgresConnection();
    if (!client) {
      const data = this._readFromFile();
      const itemWithId = this._normalizeItem(newItem);
      data.push(itemWithId);
      this._writeToFile(data);
      return itemWithId;
    }

    if (this.useGenericTable) {
      await this._ensureGenericTable();
      const normalized = this._normalizeItem(newItem);
      await client.query(`INSERT INTO ${this.safeTableName} (id, data, created_at, updated_at) VALUES ($1, $2, $3, $4)`, [normalized.id, JSON.stringify(normalized), normalized.createdAt, normalized.updatedAt]);
      return normalized;
    }

    const record = this._toDbRecord({
      id: newItem.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...newItem,
      createdAt: newItem.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const columns = Object.keys(record);
    const values = Object.values(record);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    await client.query(`INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`, values);
    return this._fromDbRecord({ id: record.id, ...record });
  }

  async update(id, updateData) {
    const client = await ensurePostgresConnection();
    if (!client) {
      const data = this._readFromFile();
      const index = data.findIndex(item => String(item.id) === String(id));
      if (index === -1) return null;
      data[index] = {
        ...data[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      this._writeToFile(data);
      return data[index];
    }

    if (this.useGenericTable) {
      await this._ensureGenericTable();
      const existing = await this.findById(id);
      const updated = this._normalizeItem({ ...(existing || {}), ...updateData, id: String(id) });
      await client.query(`UPDATE ${this.safeTableName} SET data = $1, updated_at = $2 WHERE id = $3`, [JSON.stringify(updated), updated.updatedAt, String(id)]);
      return updated;
    }

    const record = this._toDbRecord({
      ...updateData,
      updatedAt: new Date().toISOString()
    });
    const assignments = Object.entries(record).map(([key, _], index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(record);
    const result = await client.query(`UPDATE ${this.tableName} SET ${assignments} WHERE id = $1 RETURNING *`, [String(id), ...values]);
    return result.rows.length > 0 ? this._fromDbRecord(result.rows[0]) : null;
  }

  async delete(id) {
    const client = await ensurePostgresConnection();
    if (!client) {
      const data = this._readFromFile();
      const index = data.findIndex(item => String(item.id) === String(id));
      if (index === -1) return false;
      data.splice(index, 1);
      this._writeToFile(data);
      return true;
    }

    if (this.useGenericTable) {
      await this._ensureGenericTable();
      await client.query(`DELETE FROM ${this.safeTableName} WHERE id = $1`, [String(id)]);
      return true;
    }

    await client.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [String(id)]);
    return true;
  }

  async saveAll(items) {
    const client = await ensurePostgresConnection();
    if (!client) {
      this._writeToFile(items);
      return items;
    }

    await this._writeToPostgres(items);
    return items;
  }
}

module.exports = {
  JsonDB: SqlDB,
  DATA_DIR,
  ensurePostgresConnection,
  getStorageMode: () => storageMode
};
