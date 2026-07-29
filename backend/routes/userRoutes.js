const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', roleMiddleware('SUPER_ADMIN', 'PENGURUS_DAERAH'), userController.getAllUsers);
router.post('/', roleMiddleware('SUPER_ADMIN'), userController.createUser);
router.patch('/:id', roleMiddleware('SUPER_ADMIN'), userController.updateUser);
router.delete('/:id', roleMiddleware('SUPER_ADMIN'), userController.deleteUser);

module.exports = router;
