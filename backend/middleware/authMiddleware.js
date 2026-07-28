const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { db: UserDB } = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token autentikasi tidak ditemukan.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = async () => await UserDB.findById(decoded.id);
    const currentUser = await user();

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna tidak ditemukan atau token tidak valid.'
      });
    }

    req.user = {
      id: currentUser.id,
      username: currentUser.username,
      nama: currentUser.nama,
      role: currentUser.role,
      satdikId: currentUser.satdikId
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau telah kadaluwarsa.',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
