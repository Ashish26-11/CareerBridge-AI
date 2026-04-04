const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : 'Invalid token' });
    }
};

// Calculate & Save Employability Score
router.post('/score', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Weighted scoring formula
        const skillScore = Math.min((user.skills?.length || 0) * 8, 40);
        const eduMap = { '10th': 5, '12th': 10, 'Diploma': 14, 'Graduate': 20, 'Post-Graduate': 25, 'PhD': 25 };
        const eduScore = eduMap[user.education?.qualification] || 5;
        const expMap = { 'Fresher': 0, '<1 year': 5, '1-2 years': 10, '3-5 years': 15, '5+ years': 20 };
        const expScore = expMap[user.experience] || 0;
        const locScore = user.location ? 10 : 3;
        const certScore = (user.careerReadiness || 0) > 50 ? 5 : 0;

        const total = Math.min(skillScore + eduScore + expScore + locScore + certScore, 100);
        const level = total >= 70 ? 'High' : total >= 45 ? 'Medium' : 'Low';
        const levelColor = total >= 70 ? '#10b981' : total >= 45 ? '#f59e0b' : '#ef4444';

        const improvements = [];
        if (skillScore < 30) improvements.push(`Add ${Math.ceil((30 - skillScore) / 8)} more skills to your profile (+${30 - skillScore} points)`);
        if (eduScore < 20) improvements.push('Add higher education or certification details (+' + (20 - eduScore) + ' points)');
        if (expScore < 10) improvements.push('Add internship or work experience to profile (+' + (10 - expScore) + ' points)');
        if (!user.location) improvements.push('Add your location for local job matching (+7 points)');
        if (improvements.length === 0) improvements.push('Excellent profile! Keep your skills updated to maintain High score.');

        await User.findByIdAndUpdate(req.userId, { employabilityScore: total, employabilityLevel: level });

        res.json({
            score: total,
            level,
            levelColor,
            breakdown: { skillScore, eduScore, expScore, locScore, certScore },
            improvements,
            message: `Your Employability Score is ${total}/100 — ${level} level`
        });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Get current score without recalculating
router.get('/score', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('employabilityScore employabilityLevel skills education experience location careerReadiness');
        res.json({ score: user.employabilityScore || 0, level: user.employabilityLevel || 'Low' });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

module.exports = router;
