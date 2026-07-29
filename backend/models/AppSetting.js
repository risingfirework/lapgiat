const { JsonDB } = require('../config/db');

const AppSettingDB = new JsonDB('app_settings', {
  columnMap: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = {
  db: AppSettingDB
};
