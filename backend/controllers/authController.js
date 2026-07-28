const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const { db: UserDB } = require('../models/User');
const { db: SatdikDB } = require('../models/Satdik');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi.'
      });
    }

    const user = await UserDB.findOne(u => u.username === username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.'
      });
    }

    let satdikInfo = null;
    if (user.satdikId) {
      satdikInfo = await SatdikDB.findById(user.satdikId);
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        satdikId: user.satdikId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nama: user.nama,
          role: user.role,
          satdik: satdikInfo
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await UserDB.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan.'
      });
    }

    let satdikInfo = null;
    if (user.satdikId) {
      satdikInfo = await SatdikDB.findById(user.satdikId);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        satdik: satdikInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password lama dan password baru wajib diisi.'
      });
    }

    const user = await UserDB.findById(req.user.id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Password lama tidak cocok.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserDB.update(user.id, { password: hashedPassword });

    return res.status(200).json({
      success: true,
      message: 'Password berhasil diubah.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getProfile,
  changePassword
};
