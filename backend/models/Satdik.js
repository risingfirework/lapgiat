const { JsonDB } = require('../config/db');

const SatdikDB = new JsonDB('satdik', {
  columnMap: {
    kodeSatdik: 'kode_satdik',
    orderIndex: 'order_index',
    parentId: 'parent_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = {
  db: SatdikDB,
  JENJANG: {
    TK: 'TK',
    SD: 'SD',
    SMP: 'SMP',
    SMK: 'SMK',
    SMA: 'SMA',
    PENGURUS: 'PENGURUS'
  }
};
