const express = require('express');
const router = express.Router();
const satdikController = require('../controllers/satdikController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', satdikController.getAllSatdik);
router.get('/:id', satdikController.getSatdikById);
router.post('/', roleMiddleware('SUPER_ADMIN'), satdikController.createSatdik);
router.patch('/:id', roleMiddleware('SUPER_ADMIN'), satdikController.updateSatdik);
router.delete('/:id', roleMiddleware('SUPER_ADMIN'), satdikController.deleteSatdik);

module.exports = router;
