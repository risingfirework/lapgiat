const { JsonDB } = require('../config/db');

const AcademicYearDB = new JsonDB('academic_years');

module.exports = {
  db: AcademicYearDB
};
