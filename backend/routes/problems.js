const express = require('express');
const { getAllProblems, createProblem, updateProblemStatus } = require('../controllers/problemController');
const { authenticateToken } = require('../middleware/auth');
const { validateProblem } = require('../middleware/validation');

const router = express.Router();

router.get('/', getAllProblems);
router.post('/', authenticateToken, validateProblem, createProblem);
router.put('/:id/status', authenticateToken, updateProblemStatus);

module.exports = router;