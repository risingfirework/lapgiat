const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware('PENGURUS_DAERAH', 'SUPER_ADMIN'));

router.get('/pdf', exportController.exportPdf);
router.get('/excel', exportController.exportExcel);

module.exports = router;
