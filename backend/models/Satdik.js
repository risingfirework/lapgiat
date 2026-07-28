const { JsonDB } = require('../config/db');

const SatdikDB = new JsonDB('satdik');

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
