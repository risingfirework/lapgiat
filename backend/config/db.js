const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Lowdb / JSON persistence helper for Lapgiat Backend
class JsonDB {
  constructor(collectionName) {
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  _read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data || '[]');
    } catch (err) {
      return [];
    }
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  async find(queryFn = () => true) {
    const data = this._read();
    return data.filter(queryFn);
  }

  async findOne(queryFn) {
    const data = this._read();
    return data.find(queryFn) || null;
  }

  async findById(id) {
    const data = this._read();
    return data.find(item => String(item.id) === String(id)) || null;
  }

  async create(newItem) {
    const data = this._read();
    const itemWithId = {
      id: newItem.id || Date.now().toString() + Math.floor(Math.random() * 1000),
      ...newItem,
      createdAt: newItem.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.push(itemWithId);
    this._write(data);
    return itemWithId;
  }

  async update(id, updateData) {
    const data = this._read();
    const index = data.findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;

    data[index] = {
      ...data[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    this._write(data);
    return data[index];
  }

  async delete(id) {
    const data = this._read();
    const index = data.findIndex(item => String(item.id) === String(id));
    if (index === -1) return false;
    data.splice(index, 1);
    this._write(data);
    return true;
  }

  async saveAll(items) {
    this._write(items);
    return items;
  }
}

module.exports = {
  JsonDB,
  DATA_DIR
};
