const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { handleHeaderLogoUpload } = require('../middleware/uploadMiddleware');

router.use(authMiddleware);

router.get('/header', settingController.getHeaderSetting);
router.put('/header', roleMiddleware('SUPER_ADMIN'), handleHeaderLogoUpload, settingController.updateHeaderSetting);
router.get('/pdf-kop', settingController.getPdfKopSetting);
router.put('/pdf-kop', roleMiddleware('SUPER_ADMIN'), settingController.updatePdfKopSetting);

module.exports = router;
