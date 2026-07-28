const express = require('express');
const router = express.Router();
const lapgiatController = require('../controllers/lapgiatController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { handleUpload } = require('../middleware/uploadMiddleware');

router.use(authMiddleware);

router.get('/', lapgiatController.getLapgiatList);
router.get('/:id', lapgiatController.getLapgiatById);
router.post('/', handleUpload, lapgiatController.createLapgiat);
router.patch('/:id/status', roleMiddleware('PENGURUS_DAERAH', 'SUPER_ADMIN'), lapgiatController.updateStatus);
router.delete('/:id', lapgiatController.deleteLapgiat);

module.exports = router;
