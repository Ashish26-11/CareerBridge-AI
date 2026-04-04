const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Get all jobs
router.get('/', async (req, res) => {
    try {
        const query = { status: 'Active' };
        if (req.query.type) {
            query.type = req.query.type;
        }
        const jobs = await Job.find(query).populate('employerId', 'company');
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

const axios = require('axios');
const ML_URL = process.env.ML_URL || 'http://localhost:8000';

// Get matched jobs for logged-in user
router.get('/matched', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const jobs = await Job.find({ status: 'Active' }).populate('employerId', 'company');

        let matchedResults = [];
        try {
            const mlRes = await axios.post(`${ML_URL}/match`, {
                user_skills: user.skills || []
            });
            matchedResults = mlRes.data.matches || [];
        } catch (mlErr) {
            console.error("ML Match Error:", mlErr.message);
        }

        const matchedJobs = jobs.map(job => {
            const mlMatch = matchedResults.find(m => m.jobId === job._id.toString() || m.jobId === job.JobID);
            let matchScore = mlMatch ? mlMatch.matchScore : 0;

            if (matchScore === 0) {
                const jobText = (job.title + " " + job.description + " " + (job.skills ? job.skills.join(" ") : "") + " " + (job.keywords || "")).toLowerCase();
                const userSkills = user.skills?.map(s => s.toLowerCase()) || [];
                const overlap = userSkills.filter(s => jobText.includes(s));
                matchScore = userSkills.length > 0 ? Math.floor((overlap.length / userSkills.length) * 100) : 50;

                // Extra boost if specific skills match exactly
                const exactMatches = job.skills ? job.skills.filter(s => userSkills.includes(s.toLowerCase())) : [];
                if (exactMatches.length > 0) {
                    matchScore = Math.min(matchScore + 20, 100);
                }
            }

            return { ...job._doc, matchScore };
        }).sort((a, b) => b.matchScore - a.matchScore);

        res.json(matchedJobs);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Seed some jobs
router.get('/seed', async (req, res) => {
    const defaultJobs = [
        {
            title: "Data Analyst",
            company: "Infosys",
            salary: "₹6–8 LPA",
            location: "Noida",
            experience: "2-4 years",
            description: "Looking for data analysts with Python and SQL experience.",
            matchScore: 82,
            applyLink: "https://www.infosys.com/careers/"
        },
        {
            title: "Junior Analyst",
            company: "TechStartup",
            salary: "₹4–6 LPA",
            location: "Remote",
            experience: "0-2 years",
            description: "Entry-level position for fresh graduates.",
            matchScore: 74,
            applyLink: "https://www.linkedin.com/jobs/"
        }
    ];

    try {
        await Job.deleteMany({});
        const createdJobs = await Job.insertMany(defaultJobs);
        res.json(createdJobs);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

module.exports = router;
