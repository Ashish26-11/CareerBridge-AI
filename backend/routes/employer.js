const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

// Middleware to check if user is employer
const isEmployer = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());
        const user = await User.findById(decoded.id);

        if (user && user.role === 'employer') {
            req.user = user;
            next();
        } else {
            res.status(403).json({ message: 'Employer access denied' });
        }
    } catch (err) {
        res.status(401).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : 'Invalid token' });
    }
};

// -- Job Management --

// Post a new job
router.post('/jobs', isEmployer, async (req, res) => {
    try {
        const job = new Job({
            ...req.body,
            company: req.user.company?.name || req.user.name,
            employerId: req.user._id,
            postedBy: req.user.name
        });
        const savedJob = await job.save();
        res.status(201).json(savedJob);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Get all jobs by this employer
router.get('/my-jobs', isEmployer, async (req, res) => {
    try {
        const jobs = await Job.find({ employerId: req.user._id }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Update a job
router.put('/jobs/:id', isEmployer, async (req, res) => {
    try {
        const job = await Job.findOneAndUpdate(
            { _id: req.params.id, employerId: req.user._id },
            req.body,
            { new: true }
        );
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Delete a job
router.delete('/jobs/:id', isEmployer, async (req, res) => {
    try {
        const job = await Job.findOneAndDelete({ _id: req.params.id, employerId: req.user._id });
        if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
        res.json({ message: 'Job deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// -- Applicant Management --

// Get all applicants for a specific job (with AI Ranking & MSME Boost)
router.get('/jobs/:id/applicants', isEmployer, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const applicants = await Application.find({ jobId: req.params.id })
            .populate('userId', 'name email location education skills resume employabilityScore')
            .lean();

        const isMSME = req.user.company?.isMSME || false;
        const msmeBoost = isMSME ? 1.15 : 1.0;

        const rankedApplicants = applicants.map(app => {
            const user = app.userId;
            if (!user) return app;

            let baseScore = user.employabilityScore || 50; // Use employability score as base

            // Skill match bump (0 to 20 points)
            let skillMatch = 0;
            if (job.skills && job.skills.length > 0 && user.skills) {
                const matched = user.skills.filter(s => job.skills.includes(s)).length;
                skillMatch = (matched / job.skills.length) * 20;
            }

            let finalScore = (baseScore + skillMatch) * msmeBoost;
            finalScore = Math.min(100, Math.round(finalScore));

            return {
                ...app,
                matchScore: finalScore // override with dynamic score
            };
        });

        // Sort by highest match score
        rankedApplicants.sort((a, b) => b.matchScore - a.matchScore);

        res.json(rankedApplicants);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Update application status (Shortlist/Reject/Hire)
router.put('/applications/:id/status', isEmployer, async (req, res) => {
    try {
        const { status } = req.body;
        const application = await Application.findOneAndUpdate(
            { _id: req.params.id, employerId: req.user._id },
            { status, updatedAt: new Date() },
            { new: true }
        );

        if (!application) return res.status(404).json({ message: 'Application not found' });

        // If hired, update user's placement status
        if (status === 'Hired') {
            await User.findByIdAndUpdate(application.userId, { isPlaced: true });
        }

        res.json(application);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Get all hired applicants for this employer
router.get('/hired-applicants', isEmployer, async (req, res) => {
    try {
        const hired = await Application.find({
            employerId: req.user._id,
            status: 'Hired'
        })
            .populate('userId', 'name email location education skills')
            .populate('jobId', 'title')
            .sort({ updatedAt: -1 });
        res.json(hired);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// -- Employer Stats --
router.get('/stats', isEmployer, async (req, res) => {
    try {
        const totalJobs = await Job.countDocuments({ employerId: req.user._id });
        const totalApplications = await Application.countDocuments({ employerId: req.user._id });
        const hiredCount = await Application.countDocuments({ employerId: req.user._id, status: 'Hired' });
        const activeJobs = await Job.countDocuments({ employerId: req.user._id, status: 'Active' });

        res.json({
            totalJobs,
            totalApplications,
            hiredCount,
            activeJobs,
            verificationStatus: req.user.company?.verified || false
        });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

module.exports = router;
