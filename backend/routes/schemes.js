const express = require('express');
const router = express.Router();
const Scheme = require('../models/Scheme');

// Get personalized schemes
router.get('/', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            const schemes = await Scheme.find();
            return res.json(schemes);
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        const User = require('../models/User');
        const user = await User.findById(decoded.id);

        const axios = require('axios');
        const ML_URL = process.env.ML_URL || 'http://localhost:8000';

        try {
            const ml_res = await axios.post(`${ML_URL}/schemes/recommend`, {
                skills: user.skills || [],
                education: user.education?.qualification || 'Graduate'
            });
            const db_schemes = await Scheme.find();
            const ml_schemes = ml_res.data.schemes;

            // Merge and return
            return res.json([...db_schemes, ...ml_schemes]);
        } catch (ml_err) {
            console.error("ML Schemes Error:", ml_err.message);
            const schemes = await Scheme.find();
            res.json(schemes);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Seed some schemes (for hackathon demo)
router.get('/seed', async (req, res) => {
    const defaultSchemes = [
        {
            title: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY)",
            description: "Skill training and certification program with financial assistance.",
            eligibility: "Unemployed youth or school/college dropouts",
            benefits: "Certification, Skill training, Placement support",
            deadline: "31 Dec 2024",
            category: "Skill Development",
            applyLink: "https://www.pmkvyofficial.org/"
        },
        {
            title: "National Career Service (NCS)",
            description: "A digital platform that provides a variety of employment and career-related services.",
            eligibility: "Job seekers, Employers, Counselors",
            benefits: "Job matching, Career counseling, Vocational guidance",
            deadline: "Ongoing",
            category: "Employment",
            applyLink: "https://www.ncs.gov.in/"
        }
    ];

    try {
        await Scheme.deleteMany({});
        const createdSchemes = await Scheme.insertMany(defaultSchemes);
        res.json(createdSchemes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Apply to Scheme
router.post('/apply/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        
        const User = require('../models/User');
        const user = await User.findById(decoded.id);
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Convert to strings for comparison if needed, or simply check includes if ObjectId array
        const hasApplied = user.appliedSchemes.some(s => s.toString() === req.params.id);
        
        if (!hasApplied) {
            user.appliedSchemes.push(req.params.id);
            await user.save();
            
            await Scheme.findByIdAndUpdate(req.params.id, { $inc: { applicantsCount: 1 } });
            
            res.json({ message: 'Successfully applied to scheme' });
        } else {
            res.status(400).json({ message: 'Already applied' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get My Applications
router.get('/my-applications', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        
        const User = require('../models/User');
        const user = await User.findById(decoded.id).populate('appliedSchemes');
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        res.json(user.appliedSchemes || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
