const { db: LapgiatDB, STATUS } = require('../models/Lapgiat');
const { db: LapgiatMediaDB } = require('../models/LapgiatMedia');
const { db: SatdikDB } = require('../models/Satdik');
const path = require('path');

const getLapgiatList = async (req, res, next) => {
  try {
    const { tanggal, satdikId, jenjang, status } = req.query;

    let records = await LapgiatDB.find();

    // Filtering by user role (KASATDIK can only see their own Satdik unless PENGURUS_DAERAH or SUPER_ADMIN)
    if (req.user.role === 'KASATDIK' && req.user.satdikId) {
      records = records.filter(r => String(r.satdikId) === String(req.user.satdikId));
    } else if (satdikId) {
      records = records.filter(r => String(r.satdikId) === String(satdikId));
    }

    if (tanggal) {
      records = records.filter(r => r.tanggalKegiatan === tanggal);
    }

    if (status) {
      records = records.filter(r => r.status === status.toUpperCase());
    }

    const satdikList = await SatdikDB.find();
    const satdikMap = new Map(satdikList.map(s => [String(s.id), s]));

    if (jenjang) {
      records = records.filter(r => {
        const s = satdikMap.get(String(r.satdikId));
        return s && s.jenjang === jenjang.toUpperCase();
      });
    }

    const allMedia = await LapgiatMediaDB.find();
    const mediaMap = new Map();
    allMedia.forEach(m => {
      if (!mediaMap.has(String(m.lapgiatId))) {
        mediaMap.set(String(m.lapgiatId), []);
      }
      mediaMap.get(String(m.lapgiatId)).push(m);
    });

    const result = records.map(r => {
      const satdikInfo = satdikMap.get(String(r.satdikId)) || null;
      const mediaFiles = mediaMap.get(String(r.id)) || [];
      return {
        ...r,
        satdik: satdikInfo,
        media: mediaFiles
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const createLapgiat = async (req, res, next) => {
  try {
    const { tanggalKegiatan, uraianKegiatan, keteranganPeserta, satdikId } = req.body;

    const targetSatdikId = req.user.role === 'KASATDIK' ? req.user.satdikId : (satdikId || req.user.satdikId);

    if (!tanggalKegiatan || !uraianKegiatan || !targetSatdikId) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal kegiatan, uraian kegiatan, dan Satdik wajib diisi.'
      });
    }

    if (req.user.role === 'KASATDIK') {
      const existing = await LapgiatDB.findOne(item =>
        String(item.satdikId) === String(targetSatdikId) && String(item.tanggalKegiatan) === String(tanggalKegiatan)
      );

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Anda sudah membuat laporan untuk tanggal tersebut.'
        });
      }
    }

    const newLapgiat = await LapgiatDB.create({
      satdikId: targetSatdikId,
      tanggalKegiatan,
      uraianKegiatan,
      keteranganPeserta: keteranganPeserta || 'Diikuti oleh semua Murid',
      status: STATUS.SUBMITTED,
      createdBy: req.user.id,
      notes: ''
    });

    const mediaList = [];
    if (req.files && req.files.length > 0) {
      if (req.files.length > 4) {
        return res.status(400).json({
          success: false,
          message: 'Maksimal 4 foto dokumentasi yang bisa diunggah.'
        });
      }

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const media = await LapgiatMediaDB.create({
          lapgiatId: newLapgiat.id,
          fileName: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: `/uploads/${file.filename}`,
          orderIndex: i + 1
        });
        mediaList.push(media);
      }
    }

    const satdik = await SatdikDB.findById(targetSatdikId);

    return res.status(201).json({
      success: true,
      message: 'Lapgiat berhasil disubmit.',
      data: {
        ...newLapgiat,
        satdik,
        media: mediaList
      }
    });
  } catch (error) {
    next(error);
  }
};

const getLapgiatById = async (req, res, next) => {
  try {
    const record = await LapgiatDB.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Lapgiat tidak ditemukan.' });
    }

    const satdik = await SatdikDB.findById(record.satdikId);
    const media = await LapgiatMediaDB.find(m => String(m.lapgiatId) === String(record.id));

    return res.status(200).json({
      success: true,
      data: {
        ...record,
        satdik,
        media
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateLapgiat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tanggalKegiatan, uraianKegiatan, keteranganPeserta } = req.body;

    const record = await LapgiatDB.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Lapgiat tidak ditemukan.' });
    }

    if (req.user.role === 'KASATDIK' && String(record.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Anda tidak berwenang mengubah laporan ini.' });
    }

    const payload = {
      tanggalKegiatan: tanggalKegiatan || record.tanggalKegiatan,
      uraianKegiatan: uraianKegiatan || record.uraianKegiatan,
      keteranganPeserta: keteranganPeserta !== undefined ? keteranganPeserta : record.keteranganPeserta,
      updatedAt: new Date().toISOString()
    };

    if (req.user.role === 'KASATDIK') {
      const duplicate = await LapgiatDB.findOne(item =>
        String(item.id) !== String(id) &&
        String(item.satdikId) === String(record.satdikId) &&
        String(item.tanggalKegiatan) === String(payload.tanggalKegiatan)
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Anda sudah membuat laporan untuk tanggal tersebut.'
        });
      }
    }

    const existingMedia = await LapgiatMediaDB.find(m => String(m.lapgiatId) === String(id));
    const newFiles = req.files || [];
    if (existingMedia.length + newFiles.length > 4) {
      return res.status(400).json({
        success: false,
        message: `Maksimal 4 foto dokumentasi. Laporan ini sudah memiliki ${existingMedia.length} foto.`
      });
    }

    const updated = await LapgiatDB.update(id, payload);
    const mediaList = [...existingMedia];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const media = await LapgiatMediaDB.create({
        lapgiatId: id,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: `/uploads/${file.filename}`,
        orderIndex: existingMedia.length + i + 1
      });
      mediaList.push(media);
    }

    return res.status(200).json({
      success: true,
      message: 'Lapgiat berhasil diperbarui.',
      data: {
        ...updated,
        media: mediaList
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const { id } = req.params;

    if (!status || !Object.values(STATUS).includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid.' });
    }

    const record = await LapgiatDB.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Lapgiat tidak ditemukan.' });
    }

    const updated = await LapgiatDB.update(id, {
      status,
      notes: notes || record.notes,
      approvedBy: req.user.id,
      approvedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Status Lapgiat berhasil diperbarui menjadi ${status}.`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

const deleteLapgiat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await LapgiatDB.findById(id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Lapgiat tidak ditemukan.' });
    }

    await LapgiatDB.delete(id);
    // Delete media references
    const mediaList = await LapgiatMediaDB.find(m => String(m.lapgiatId) === String(id));
    for (const m of mediaList) {
      await LapgiatMediaDB.delete(m.id);
    }

    return res.status(200).json({ success: true, message: 'Lapgiat berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLapgiatList,
  createLapgiat,
  getLapgiatById,
  updateLapgiat,
  updateStatus,
  deleteLapgiat
};
