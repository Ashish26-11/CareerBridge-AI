const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Consultant = require('../models/Consultant');
const Session = require('../models/Session');

// Middleware to check if user is Consultant
const isConsultant = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        const user = await User.findById(decoded.id);

        if (user && user.role === 'consultant') {
            req.user = user;
            next();
        } else {
            res.status(403).json({ message: 'Access denied: Consultants only' });
        }
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Consultant Onboarding
router.post('/onboard', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

        const { expertise, experience, languages, fee, bio } = req.body;

        let consultant = await Consultant.findOne({ userId: decoded.id });
        if (consultant) {
            return res.status(400).json({ message: 'Already onboarded as a consultant' });
        }

        consultant = new Consultant({
            userId: decoded.id,
            expertise,
            experience,
            languages,
            fee,
            bio,
            status: 'pending'
        });

        await consultant.save();

        // Also ensure user role is set to consultant (if not already during signup)
        await User.findByIdAndUpdate(decoded.id, { role: 'consultant' });

        res.status(201).json({ message: 'Consultant profile sent for approval', consultant });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get My Consultant Profile
router.get('/profile', isConsultant, async (req, res) => {
    try {
        const consultant = await Consultant.findOne({ userId: req.user._id });
        res.json(consultant);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Consultant Dashboard Stats
router.get('/dashboard-stats', isConsultant, async (req, res) => {
    try {
        const consultant = await Consultant.findOne({ userId: req.user._id });
        if (!consultant) return res.status(404).json({ message: 'Consultant not found' });

        const upcomingSessions = await Session.countDocuments({
            consultantId: consultant._id,
            status: 'scheduled',
            'slot.startTime': { $gte: new Date() }
        });

        const totalConsultations = await Session.countDocuments({
            consultantId: consultant._id,
            status: 'completed'
        });

        const Payment = require('../models/Payment');
        const earnings = await Payment.aggregate([
            { $match: { consultantId: consultant._id, status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            upcomingSessions,
            totalConsultations,
            totalEarnings: earnings[0]?.total || 0,
            rating: consultant.rating
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Consultant Sessions
router.get('/sessions', isConsultant, async (req, res) => {
    try {
        const consultant = await Consultant.findOne({ userId: req.user._id });
        const sessions = await Session.find({ consultantId: consultant._id })
            .populate('userId', 'name email education skills careerGoals')
            .sort({ 'slot.startTime': 1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Start Session
router.post('/sessions/:id/start', isConsultant, async (req, res) => {
    try {
        const session = await Session.findByIdAndUpdate(req.params.id, {
            status: 'in-progress'
        }, { new: true });
        res.json({ message: 'Session started successfully', session });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Complete Session and Submit Feedback
router.post('/sessions/:id/complete', isConsultant, async (req, res) => {
    try {
        const { suggestions, skillImprovements, learningResources, resumeFeedback } = req.body;
        const axios = require('axios');
        const ML_URL = process.env.ML_URL || 'http://localhost:8000';

        const session = await Session.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        session.status = 'completed';
        session.notes = { suggestions, skillImprovements, learningResources, resumeFeedback };

        // Generate AI Summary (Resilient)
        try {
            const ml_res = await axios.post(`${ML_URL}/generate-session-summary`, {
                messages: session.messages
            });
            session.aiSummary = {
                summary: ml_res.data.summary || "No summary generated.",
                keyTopics: ml_res.data.key_topics || [],
                actionItems: ml_res.data.action_items || []
            };
        } catch (ml_err) {
            console.error("ML Summary Error:", ml_err.message);
            // Fallback if AI summary fails
            session.aiSummary = {
                summary: "AI summary unavailable for this session.",
                keyTopics: [],
                actionItems: []
            };
        }

        await session.save();

        res.json({ message: 'Session completed successfully', session });
    } catch (err) {
        console.error("Session completion error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Get Consultant Availability (Public)
router.get('/:id/availability', async (req, res) => {
    try {
        const consultant = await Consultant.findById(req.params.id);
        if (!consultant) return res.status(404).json({ message: 'Consultant not found' });
        res.json(consultant.availability || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Consultant Availability (Protected)
router.post('/availability', isConsultant, async (req, res) => {
    try {
        const { availability } = req.body;
        const consultant = await Consultant.findOneAndUpdate(
            { userId: req.user._id },
            { availability },
            { new: true }
        );
        res.json({ message: 'Availability updated successfully', availability: consultant.availability });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
