const express = require('express');
const router = express.Router();
const { simulateCareer } = require('../controllers/simulationController');

// Simulate career (no auth for testing)
router.post('/simulate', simulateCareer);

module.exports = router;