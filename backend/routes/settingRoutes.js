const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/header', settingController.getHeaderSetting);
router.put('/header', roleMiddleware('SUPER_ADMIN'), settingController.updateHeaderSetting);

module.exports = router;
