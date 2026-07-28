const { JsonDB } = require('../config/db');

const UserDB = new JsonDB('users');

module.exports = {
  db: UserDB,
  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    PENGURUS_DAERAH: 'PENGURUS_DAERAH',
    KASATDIK: 'KASATDIK'
  }
};
