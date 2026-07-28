const express = require('express');
const router = express.Router();
const satdikController = require('../controllers/satdikController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', satdikController.getAllSatdik);
router.get('/:id', satdikController.getSatdikById);
router.post('/', roleMiddleware('SUPER_ADMIN'), satdikController.createSatdik);

module.exports = router;
