const { db: AppSettingDB } = require('../models/AppSetting');
const fs = require('fs');
const path = require('path');

const HEADER_SETTING_KEY = 'header_logo';
const PDF_KOP_SETTING_KEY = 'pdf_kop';
const DEFAULT_PDF_KOP = {
  orgLine1: 'YAYASAN HANG TUAH',
  orgLine2: 'PENGURUS DAERAH JAKARTA',
  orgAlign: 'center',
  titleLine1: 'KEGIATAN HARIAN DI LINGKUNGAN',
  titleLine2: 'DAERAH JAKARTA YAYASAN HANG TUAH',
  titleAlign: 'center',
  yearAlign: 'center',
  signatureTitle: 'Ketua Pengurus Daerah',
  signatureName: 'Ny. Hening Uki Prasetia'
};

const removeOldLogoIfLocal = (logoUrl) => {
  if (!logoUrl || !logoUrl.startsWith('/uploads/')) return;

  const fileName = path.basename(logoUrl);
  const filePath = path.join(__dirname, '../uploads', fileName);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      // Ignore delete errors to avoid blocking setting update.
    }
  }
};

const getHeaderSetting = async (req, res, next) => {
  try {
    const setting = await AppSettingDB.findOne(item => item.key === HEADER_SETTING_KEY);

    return res.status(200).json({
      success: true,
      data: {
        key: HEADER_SETTING_KEY,
        logoUrl: setting && setting.logoUrl ? setting.logoUrl : ''
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateHeaderSetting = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File logo header wajib diunggah.'
      });
    }

    const logoUrl = `/uploads/${req.file.filename}`;

    const existing = await AppSettingDB.findOne(item => item.key === HEADER_SETTING_KEY);
    if (!existing) {
      const created = await AppSettingDB.create({
        key: HEADER_SETTING_KEY,
        logoUrl,
        updatedBy: req.user.id
      });

      return res.status(200).json({
        success: true,
        message: 'Logo header berhasil diunggah.',
        data: {
          key: created.key,
          logoUrl: created.logoUrl || ''
        }
      });
    }

    removeOldLogoIfLocal(existing.logoUrl);

    const updated = await AppSettingDB.update(existing.id, {
      logoUrl,
      updatedBy: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: 'Logo header berhasil diperbarui.',
      data: {
        key: updated.key,
        logoUrl: updated.logoUrl || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPdfKopSetting = async (req, res, next) => {
  try {
    const setting = await AppSettingDB.findOne(item => item.key === PDF_KOP_SETTING_KEY);
    const value = setting && setting.value ? setting.value : {};

    return res.status(200).json({
      success: true,
      data: {
        key: PDF_KOP_SETTING_KEY,
        ...DEFAULT_PDF_KOP,
        ...value
      }
    });
  } catch (error) {
    next(error);
  }
};

const updatePdfKopSetting = async (req, res, next) => {
  try {
    const payload = {
      orgLine1: String(req.body.orgLine1 || DEFAULT_PDF_KOP.orgLine1).trim(),
      orgLine2: String(req.body.orgLine2 || DEFAULT_PDF_KOP.orgLine2).trim(),
      orgAlign: String(req.body.orgAlign || DEFAULT_PDF_KOP.orgAlign).toLowerCase() === 'left' ? 'left' : 'center',
      titleLine1: String(req.body.titleLine1 || DEFAULT_PDF_KOP.titleLine1).trim(),
      titleLine2: String(req.body.titleLine2 || DEFAULT_PDF_KOP.titleLine2).trim(),
      titleAlign: String(req.body.titleAlign || DEFAULT_PDF_KOP.titleAlign).toLowerCase() === 'left' ? 'left' : 'center',
      yearAlign: String(req.body.yearAlign || DEFAULT_PDF_KOP.yearAlign).toLowerCase() === 'left' ? 'left' : 'center',
      signatureTitle: String(req.body.signatureTitle || DEFAULT_PDF_KOP.signatureTitle).trim(),
      signatureName: String(req.body.signatureName || DEFAULT_PDF_KOP.signatureName).trim()
    };

    const existing = await AppSettingDB.findOne(item => item.key === PDF_KOP_SETTING_KEY);

    if (!existing) {
      const created = await AppSettingDB.create({
        key: PDF_KOP_SETTING_KEY,
        value: payload,
        updatedBy: req.user.id
      });

      return res.status(200).json({
        success: true,
        message: 'Pengaturan kop PDF berhasil disimpan.',
        data: {
          key: created.key,
          ...DEFAULT_PDF_KOP,
          ...(created.value || {})
        }
      });
    }

    const updated = await AppSettingDB.update(existing.id, {
      value: payload,
      updatedBy: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: 'Pengaturan kop PDF berhasil diperbarui.',
      data: {
        key: updated.key,
        ...DEFAULT_PDF_KOP,
        ...(updated.value || {})
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHeaderSetting,
  updateHeaderSetting,
  getPdfKopSetting,
  updatePdfKopSetting,
  DEFAULT_PDF_KOP,
  PDF_KOP_SETTING_KEY
};
