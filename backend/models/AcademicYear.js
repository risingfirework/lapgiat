const { JsonDB } = require('../config/db');

const AcademicYearDB = new JsonDB('academic_years', {
  columnMap: {
    isCurrent: 'is_current',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = {
  db: AcademicYearDB
};
