const { JsonDB } = require('../config/db');

const UserDB = new JsonDB('users', {
  columnMap: {
    satdikId: 'satdik_id',
    parentId: 'parent_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = {
  db: UserDB,
  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    PENGURUS_DAERAH: 'PENGURUS_DAERAH',
    KASATDIK: 'KASATDIK'
  }
};
