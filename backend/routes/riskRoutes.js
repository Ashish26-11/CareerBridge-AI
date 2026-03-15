const express = require('express');
const router = express.Router();
const { analyzeRisk, getUserRisk } = require('../controllers/riskController');
// const auth = require('../middleware/auth'); // Commented out for testing

// Analyze risk for logged-in user (NO AUTH for testing)
router.get('/analyze', analyzeRisk);

// Get risk for specific user (NO AUTH for testing)
router.get('/user/:userId', getUserRisk);

module.exports = router;