const bcrypt = require('bcryptjs');
const { db: UserDB } = require('../models/User');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await UserDB.find();
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      nama: u.nama,
      role: u.role,
      satdikId: u.satdikId,
      createdAt: u.createdAt
    }));
    return res.status(200).json({ success: true, data: safeUsers });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { username, password, nama, role, satdikId } = req.body;

    if (!username || !password || !nama || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, nama, dan role wajib diisi.'
      });
    }

    const existingUser = await UserDB.findOne(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username sudah digunakan.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await UserDB.create({
      username,
      password: hashedPassword,
      nama,
      role,
      satdikId: satdikId || null
    });

    return res.status(201).json({
      success: true,
      message: 'User berhasil dibuat.',
      data: {
        id: newUser.id,
        username: newUser.username,
        nama: newUser.nama,
        role: newUser.role,
        satdikId: newUser.satdikId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser
};
