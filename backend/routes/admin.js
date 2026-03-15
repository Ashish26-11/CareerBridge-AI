const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to check if user is Admin
const isAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        const user = await User.findById(decoded.id);

        if (user && user.role === 'admin') {
            req.user = user;
            next();
        } else {
            res.status(403).json({ message: 'Access denied: Admins only' });
        }
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

const Career = require('../models/Career');
const Job = require('../models/Job');
const Scheme = require('../models/Scheme');
const Skill = require('../models/Skill');

// Admin Stats
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });

        // Active users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsersCount = await User.countDocuments({
            role: 'user',
            lastActive: { $gte: sevenDaysAgo }
        });

        const jobPlacements = await User.countDocuments({ role: 'user', isPlaced: true });

        const totalJobs = await Job.countDocuments();
        const totalSchemes = await Scheme.countDocuments();

        const riskStats = await User.aggregate([
            { $match: { role: 'user' } },
            {
                $group: {
                    _id: null,
                    avg: { $avg: "$unemploymentRisk" },
                    highRiskCount: { $sum: { $cond: [{ $gt: ["$unemploymentRisk", 60] }, 1, 0] } }
                }
            }
        ]);

        const popCareer = await User.aggregate([
            { $unwind: "$interests" },
            { $group: { _id: "$interests", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        res.json({
            totalUsers,
            activeUsers: activeUsersCount,
            placements: jobPlacements,
            avgRisk: Math.round(riskStats[0]?.avg || 0),
            highRiskPercentage: totalUsers > 0 ? Math.round((riskStats[0]?.highRiskCount / totalUsers) * 100) : 0,
            popularCareer: popCareer[0]?._id || "N/A",
            totalJobs,
            totalSchemes
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Generic CRUD helper (or individual routes)
// -- Users --
router.get('/users', isAdmin, async (req, res) => {
    res.json(await User.find({ role: 'user' }).select('-password'));
});

router.put('/users/:id', isAdmin, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -- Careers --
router.get('/careers', isAdmin, async (req, res) => {
    res.json(await Career.find());
});
router.post('/careers', isAdmin, async (req, res) => {
    const career = new Career(req.body);
    res.json(await career.save());
});
router.put('/careers/:id', isAdmin, async (req, res) => {
    res.json(await Career.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
router.delete('/careers/:id', isAdmin, async (req, res) => {
    await Career.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// -- Jobs --
router.get('/jobs-all', isAdmin, async (req, res) => {
    res.json(await Job.find());
});
router.post('/jobs', isAdmin, async (req, res) => {
    const job = new Job(req.body);
    res.json(await job.save());
});
router.delete('/jobs/:id', isAdmin, async (req, res) => {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

router.put('/jobs/:id', isAdmin, async (req, res) => {
    try {
        const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedJob);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -- Schemes --
router.get('/schemes-all', isAdmin, async (req, res) => {
    res.json(await Scheme.find());
});
router.post('/schemes', isAdmin, async (req, res) => {
    const scheme = new Scheme(req.body);
    res.json(await scheme.save());
});
router.delete('/schemes/:id', isAdmin, async (req, res) => {
    await Scheme.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// -- Skills --
router.get('/skills', isAdmin, async (req, res) => {
    res.json(await Skill.find());
});
router.post('/skills', isAdmin, async (req, res) => {
    const skill = new Skill(req.body);
    res.json(await skill.save());
});
router.delete('/skills/:id', isAdmin, async (req, res) => {
    await Skill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// -- Employer Management --
router.get('/employers', isAdmin, async (req, res) => {
    res.json(await User.find({ role: 'employer' }).select('-password'));
});

router.put('/employers/:id/verify', isAdmin, async (req, res) => {
    try {
        const employer = await User.findByIdAndUpdate(
            req.params.id,
            { 'company.verified': req.body.verified },
            { new: true }
        ).select('-password');
        res.json(employer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -- Placement Analytics --
router.get('/placements', isAdmin, async (req, res) => {
    try {
        const Application = require('../models/Application');
        const placements = await Application.find({ status: 'Hired' })
            .populate('userId', 'name skills')
            .populate('jobId', 'title company')
            .sort({ updatedAt: -1 });
        res.json(placements);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -- Analytics --
router.get('/analytics', isAdmin, async (req, res) => {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const riskData = await User.aggregate([
        { $match: { role: 'user' } },
        {
            $group: {
                _id: null,
                high: { $sum: { $cond: [{ $gt: ["$unemploymentRisk", 60] }, 1, 0] } },
                medium: { $sum: { $cond: [{ $and: [{ $gt: ["$unemploymentRisk", 30] }, { $lte: ["$unemploymentRisk", 60] }] }, 1, 0] } },
                low: { $sum: { $cond: [{ $lte: ["$unemploymentRisk", 30] }, 1, 0] } }
            }
        }
    ]);

    const regionalRisk = await User.aggregate([
        { $match: { role: 'user', location: { $exists: true, $ne: "" } } },
        {
            $group: {
                _id: "$location",
                avgRisk: { $avg: "$unemploymentRisk" },
                count: { $sum: 1 }
            }
        },
        { $sort: { avgRisk: -1 } },
        { $limit: 10 }
    ]);

    const skillClusterRisk = await User.aggregate([
        { $match: { role: 'user', skills: { $exists: true, $not: { $size: 0 } } } },
        { $unwind: "$skills" },
        {
            $group: {
                _id: "$skills",
                avgRisk: { $avg: "$unemploymentRisk" },
                count: { $sum: 1 }
            }
        },
        { $sort: { avgRisk: -1 } },
        { $limit: 10 }
    ]);

    const totalHired = await Application.countDocuments({ status: 'Hired' });
    const totalApplications = await Application.countDocuments();

    res.json({
        totalUsers,
        totalApplications,
        totalHired,
        popularCareers: await User.aggregate([
            { $unwind: "$interests" },
            { $group: { _id: "$interests", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),
        riskDistribution: riskData[0] || { high: 0, medium: 0, low: 0 },
        regionalRisk,
        skillClusterRisk
    });
});

// -- ML Model Control --
router.post('/ml/retrain', isAdmin, async (req, res) => {
    const { modelType } = req.body;
    const { exec } = require('child_process');
    const path = require('path');

    let scriptName = '';
    if (modelType === 'career') scriptName = 'train_career_recommend.py';
    else if (modelType === 'simulation') scriptName = 'train_career_simulation.py';
    else if (modelType === 'risk') scriptName = 'train_unemployment_risk.py';
    else if (modelType === 'match') scriptName = 'prepare_job_match.py';
    else return res.status(400).json({ message: 'Invalid model type' });

    const scriptPath = path.join(__dirname, '../../ml_service/scripts', scriptName);

    // Run script asynchronously
    exec(`py "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Retrain error: ${error}`);
            return;
        }
        console.log(`Retrain success: ${stdout}`);
    });

    res.json({ message: `Retraining ${modelType} model started...` });
});

// -- Consultant Management --
const Consultant = require('../models/Consultant');

// Get all consultants (for admin panel)
router.get('/consultants', isAdmin, async (req, res) => {
    try {
        const consultants = await Consultant.find().populate('userId', 'name email');
        res.json(consultants);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/consultants/pending', isAdmin, async (req, res) => {
    try {
        const pending = await Consultant.find({ status: 'pending' }).populate('userId', 'name email');
        res.json(pending);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/consultants/:id/verify', isAdmin, async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        const consultant = await Consultant.findByIdAndUpdate(req.params.id, { status }, { new: true });

        // If approved, ensure user role is set (redundant but safe)
        if (status === 'approved') {
            await User.findByIdAndUpdate(consultant.userId, { role: 'consultant' });
        }

        res.json({ message: `Consultant ${status}`, consultant });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/consultants/analytics', isAdmin, async (req, res) => {
    try {
        const totalSessions = await require('../models/Session').countDocuments({ status: 'completed' });
        const Payment = require('../models/Payment');
        const revenue = await Payment.aggregate([
            { $match: { status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            totalSessions,
            totalRevenue: revenue[0]?.total || 0,
            commission: (revenue[0]?.total || 0) * 0.15 // 15% platform fee
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -- Heatmap Data --
router.get('/district-stats', isAdmin, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const districtDataPath = path.join(__dirname, '../data/district_data.json');
        
        let districtData = [];
        if (fs.existsSync(districtDataPath)) {
            const raw = fs.readFileSync(districtDataPath);
            districtData = JSON.parse(raw);
        }

        const totalDistricts = districtData.length;
        const avgUnemployment = totalDistricts > 0 
            ? (districtData.reduce((acc, curr) => acc + curr.unemploymentRate, 0) / totalDistricts).toFixed(1)
            : 0;
            
        // Find most affected state
        const stateMap = {};
        let mostAffectedState = 'N/A';
        let maxRate = 0;
        
        districtData.forEach(d => {
            if (!stateMap[d.state]) stateMap[d.state] = { totalRate: 0, count: 0 };
            stateMap[d.state].totalRate += d.unemploymentRate;
            stateMap[d.state].count += 1;
        });
        
        for (const [state, data] of Object.entries(stateMap)) {
            const avg = data.totalRate / data.count;
            if (avg > maxRate) {
                maxRate = avg;
                mostAffectedState = state;
            }
        }

        res.json({
            data: districtData,
            summary: {
                totalDistricts,
                nationalAvg: parseFloat(avgUnemployment),
                mostAffectedState
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -- Scheme Impact Analytics --
router.get('/scheme-analytics', isAdmin, async (req, res) => {
    try {
        const schemes = await Scheme.find();
        
        let totalApplicants = 0;
        let totalConverted = 0;
        let totalDropOff = 0;
        
        const analyticsData = schemes.map(s => {
            const applicantsCount = s.applicantsCount || 0;
            const convertedCount = s.convertedCount || 0;
            const dropOffCount = s.dropOffCount || 0;
            
            totalApplicants += applicantsCount;
            totalConverted += convertedCount;
            totalDropOff += dropOffCount;
            
            const conversionRate = applicantsCount > 0 ? ((convertedCount / applicantsCount) * 100).toFixed(1) : 0;
            const dropOffRate = applicantsCount > 0 ? ((dropOffCount / applicantsCount) * 100).toFixed(1) : 0;
            
            return {
                _id: s._id,
                title: s.title,
                category: s.category,
                incomeLimit: s.incomeLimit,
                applicantsCount,
                convertedCount,
                dropOffCount,
                conversionRate: parseFloat(conversionRate),
                dropOffRate: parseFloat(dropOffRate)
            };
        });
        
        const overallConversion = totalApplicants > 0 ? ((totalConverted / totalApplicants) * 100).toFixed(1) : 0;
        
        res.json({
            data: analyticsData,
            summary: {
                totalSchemes: schemes.length,
                totalApplicants,
                overallConversion: parseFloat(overallConversion),
                totalConverted
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
