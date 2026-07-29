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

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, nama, role, satdikId } = req.body;

    const existing = await UserDB.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan.'
      });
    }

    const payload = {};

    if (username && username !== existing.username) {
      const used = await UserDB.findOne(u => u.username === username && String(u.id) !== String(id));
      if (used) {
        return res.status(400).json({
          success: false,
          message: 'Username sudah digunakan.'
        });
      }
      payload.username = username;
    }

    if (nama !== undefined) payload.nama = nama;
    if (role !== undefined) payload.role = role;
    if (satdikId !== undefined) payload.satdikId = satdikId || null;

    if (password) {
      payload.password = await bcrypt.hash(password, 10);
    }

    const updated = await UserDB.update(id, payload);

    return res.status(200).json({
      success: true,
      message: 'User berhasil diperbarui.',
      data: {
        id: updated.id,
        username: updated.username,
        nama: updated.nama,
        role: updated.role,
        satdikId: updated.satdikId || null,
        createdAt: updated.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await UserDB.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan.'
      });
    }

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak bisa menghapus akun Anda sendiri.'
      });
    }

    await UserDB.delete(id);

    return res.status(200).json({
      success: true,
      message: 'User berhasil dihapus.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
