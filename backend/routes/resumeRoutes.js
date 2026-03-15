const express = require('express');
const router = express.Router();
const { getQuestions, buildProfile, saveProfile } = require('../controllers/resumeController');

// Get questions for zero-resume flow
router.get('/questions', getQuestions);

// Build profile from answers
router.post('/build', buildProfile);

// Save profile to database
router.post('/save', saveProfile);

module.exports = router;