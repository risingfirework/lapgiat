const { JsonDB } = require('../config/db');

const LapgiatDB = new JsonDB('lapgiat', {
  columnMap: {
    satdikId: 'satdik_id',
    tanggalKegiatan: 'tanggal_kegiatan',
    uraianKegiatan: 'uraian_kegiatan',
    keteranganPeserta: 'keterangan_peserta',
    createdBy: 'created_by',
    approvedBy: 'approved_by',
    approvedAt: 'approved_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

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
