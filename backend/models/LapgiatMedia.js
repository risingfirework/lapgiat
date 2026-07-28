const { JsonDB } = require('../config/db');

const LapgiatMediaDB = new JsonDB('lapgiat_media', {
  columnMap: {
    lapgiatId: 'lapgiat_id',
    fileName: 'file_name',
    originalName: 'original_name',
    mimeType: 'mime_type',
    orderIndex: 'order_index',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = {
  db: LapgiatMediaDB
};
