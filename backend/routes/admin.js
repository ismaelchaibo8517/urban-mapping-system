const express = require('express');
const { getStats, getAllUsers } = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas admin requerem autenticação e privilégios de admin
router.use(authenticateToken, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getAllUsers);

module.exports = router;