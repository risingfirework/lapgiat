const { JsonDB } = require('../config/db');

const LapgiatDB = new JsonDB('lapgiat');

module.exports = {
  db: LapgiatDB,
  STATUS: {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    REVISED: 'REVISED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
  }
};
