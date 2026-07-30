const { JsonDB } = require('../config/db');

const AcademicYearDB = new JsonDB('academic_years', {
  columnMap: {
    isCurrent: 'is_current',
    updatedBy: 'updated_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = {
  db: AcademicYearDB
};
