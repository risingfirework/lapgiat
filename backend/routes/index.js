const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const satdikRoutes = require('./satdikRoutes');
const lapgiatRoutes = require('./lapgiatRoutes');
const exportRoutes = require('./exportRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/satdik', satdikRoutes);
router.use('/lapgiat', lapgiatRoutes);
router.use('/export', exportRoutes);

module.exports = router;
