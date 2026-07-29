const { db: SatdikDB } = require('../models/Satdik');
const { db: UserDB } = require('../models/User');
const { db: LapgiatDB } = require('../models/Lapgiat');

const getAllSatdik = async (req, res, next) => {
  try {
    const { jenjang } = req.query;
    let list = await SatdikDB.find();

    if (jenjang) {
      list = list.filter(s => s.jenjang === jenjang.toUpperCase());
    }

    // Sort order: TK, SD, SMP, SMK, SMA, PENGURUS
    const orderMap = { TK: 1, SD: 2, SMP: 3, SMK: 4, SMA: 5, PENGURUS: 6 };
    list.sort((a, b) => {
      const ordA = orderMap[a.jenjang] || 99;
      const ordB = orderMap[b.jenjang] || 99;
      if (ordA !== ordB) return ordA - ordB;
      return (a.orderIndex || 0) - (b.orderIndex || 0);
    });

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

const createSatdik = async (req, res, next) => {
  try {
    const { kodeSatdik, nama, jenjang, alamat, orderIndex } = req.body;

    if (!nama || !jenjang) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan jenjang Satdik wajib diisi.'
      });
    }

    let finalKodeSatdik = kodeSatdik || `SATDIK-${Date.now()}`;

    const existing = await SatdikDB.findOne(item => item.kodeSatdik === finalKodeSatdik);
    let newSatdik;
    if (existing) {
      newSatdik = await SatdikDB.update(existing.id, {
        kodeSatdik: finalKodeSatdik,
        nama,
        jenjang: jenjang.toUpperCase(),
        alamat: alamat || '',
        orderIndex: orderIndex || 0
      });
    } else {
      newSatdik = await SatdikDB.create({
        kodeSatdik: finalKodeSatdik,
        nama,
        jenjang: jenjang.toUpperCase(),
        alamat: alamat || '',
        orderIndex: orderIndex || 0
      });
    }

    return res.status(201).json({ success: true, data: newSatdik });
  } catch (error) {
    next(error);
  }
};

const getSatdikById = async (req, res, next) => {
  try {
    const satdik = await SatdikDB.findById(req.params.id);
    if (!satdik) {
      return res.status(404).json({ success: false, message: 'Satdik tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: satdik });
  } catch (error) {
    next(error);
  }
};

const updateSatdik = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { kodeSatdik, nama, jenjang, alamat, orderIndex } = req.body;

    const existing = await SatdikDB.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Satdik tidak ditemukan.' });
    }

    const payload = {
      kodeSatdik: kodeSatdik || existing.kodeSatdik,
      nama: nama || existing.nama,
      jenjang: (jenjang || existing.jenjang || '').toUpperCase(),
      alamat: alamat !== undefined ? alamat : existing.alamat,
      orderIndex: orderIndex !== undefined ? orderIndex : existing.orderIndex
    };

    const duplicateKode = await SatdikDB.findOne(item =>
      String(item.id) !== String(id) &&
      String(item.kodeSatdik || '').toUpperCase() === String(payload.kodeSatdik || '').toUpperCase()
    );

    if (duplicateKode) {
      return res.status(409).json({
        success: false,
        message: 'Kode Satdik sudah digunakan oleh satdik lain.'
      });
    }

    const updated = await SatdikDB.update(id, payload);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteSatdik = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await SatdikDB.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Satdik tidak ditemukan.' });
    }

    const userUsingSatdik = await UserDB.findOne(item => String(item.satdikId) === String(id));
    if (userUsingSatdik) {
      return res.status(400).json({
        success: false,
        message: 'Satdik tidak bisa dihapus karena masih dipakai oleh data user.'
      });
    }

    const lapgiatUsingSatdik = await LapgiatDB.findOne(item => String(item.satdikId) === String(id));
    if (lapgiatUsingSatdik) {
      return res.status(400).json({
        success: false,
        message: 'Satdik tidak bisa dihapus karena masih dipakai oleh data lapgiat.'
      });
    }

    await SatdikDB.delete(id);
    return res.status(200).json({ success: true, message: 'Satdik berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSatdik,
  createSatdik,
  getSatdikById,
  updateSatdik,
  deleteSatdik
};
