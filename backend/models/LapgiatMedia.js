const { JsonDB } = require('../config/db');

const LapgiatMediaDB = new JsonDB('lapgiat_media');

module.exports = {
  db: LapgiatMediaDB
};
