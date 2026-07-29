const { db: AppSettingDB } = require('../models/AppSetting');

const HEADER_SETTING_KEY = 'header_logo';

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
    const { logoUrl } = req.body;

    const existing = await AppSettingDB.findOne(item => item.key === HEADER_SETTING_KEY);
    if (!existing) {
      const created = await AppSettingDB.create({
        key: HEADER_SETTING_KEY,
        logoUrl: logoUrl || '',
        updatedBy: req.user.id
      });

      return res.status(200).json({
        success: true,
        message: 'Pengaturan logo header berhasil disimpan.',
        data: {
          key: created.key,
          logoUrl: created.logoUrl || ''
        }
      });
    }

    const updated = await AppSettingDB.update(existing.id, {
      logoUrl: logoUrl || '',
      updatedBy: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: 'Pengaturan logo header berhasil diperbarui.',
      data: {
        key: updated.key,
        logoUrl: updated.logoUrl || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHeaderSetting,
  updateHeaderSetting
};
