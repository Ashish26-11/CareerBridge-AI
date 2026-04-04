const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Razorpay = require('razorpay');
const careerSimulator = require('../services/careerSimulator');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});


// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role, companyName, website, gst, consultantData, userTrack } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: 'User already exists' });

        const userData = { name, email, password, role: role || 'user', userTrack: userTrack || 'tech' };
        if (role === 'employer') {
            userData.company = {
                name: companyName,
                website: website,
                gst: gst,
                verified: false
            };
        }

        const user = new User(userData);
        await user.save();

        // If consultant, create consultant profile
        if (role === 'consultant' && consultantData) {
            const Consultant = require('../models/Consultant');
            const consultant = new Consultant({
                userId: user._id,
                expertise: consultantData.expertise || [],
                experience: consultantData.experience || 0,
                languages: consultantData.languages || [],
                fee: consultantData.fee || 0,
                bio: consultantData.bio || '',
                status: 'pending'
            });
            await consultant.save();
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })(), { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })(), { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Get Career Recommendations
router.get('/recommendations', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());

        const user = await User.findById(decoded.id);
        const Career = require('../models/Career');
        const axios = require('axios');
        const ML_URL = process.env.ML_URL || 'http://localhost:8000';

        // Prepare profile for ML
        const profile = {
            course: user.education || 'None',
            specialization: user.skills?.[0] || 'General',
            interests: user.interests || 'Technology',
            skills: user.skills || [],
            cgpa: 7.5 // Placeholder if not in model
        };

        let recommendedRole = "Software Engineer";
        let recommendations = [];
        try {
            const ml_res = await axios.post(`${ML_URL}/recommend`, profile);
            recommendations = ml_res.data.recommendations || [];
            if (recommendations.length > 0) {
                recommendedRole = recommendations[0].career;
            }
        } catch (ml_err) {
            console.error("ML Service Error (Recommend):", ml_err.message);
        }

        const careers = await Career.find();
        const matches = careers.map(c => {
            const mlRec = recommendations.find(r => r.career.toLowerCase().includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(r.career.toLowerCase()));

            const skillOverlap = c.skillsRequired.filter(s => user.skills.includes(s));
            let matchScore = user.skills.length > 0 ? Math.min(Math.floor((skillOverlap.length / c.skillsRequired.length) * 100) + 30, 95) : 25;

            if (mlRec) {
                matchScore = Math.min(matchScore + 20, 99);
            }

            return { ...c._doc, matchScore, aiRecommendation: !!mlRec, confidence: mlRec ? mlRec.confidence : null };
        }).sort((a, b) => b.matchScore - a.matchScore);

        res.json(matches);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Career Simulation
router.post('/simulate', async (req, res) => {
    try {
        const { careerId, year } = req.body;
        const Career = require('../models/Career');
        const axios = require('axios');

        // Handle Non-Tech Simulation (Custom Logic)
        if (typeof careerId === 'string' && careerId.startsWith('non-tech-')) {
            const trade = careerId.replace('non-tech-', '');
            const salaryData = careerSimulator.getSalaryData();
            const tradeData = salaryData[Object.keys(salaryData).find(k => k.toLowerCase() === trade.toLowerCase())];
            
            if (tradeData) {
                const baseEntry = parseInt(tradeData.entry.split('-')[0]);
                const growth = 1.15; // 15% annual growth for non-tech
                const projected = Math.floor(baseEntry * 100000 * Math.pow(growth, year));
                
                return res.json({
                    year,
                    projectedSalary: `₹${projected.toLocaleString()}`,
                    marketStability: 'High',
                    riskLevel: 'Low'
                });
            }
        }

        const career = await Career.findById(careerId);
        
        // Fallback: use careerSimulator salary data for accurate estimates
        const careerSimulator = require('../services/careerSimulator');
        const salaryData = careerSimulator.getSalaryData();

        // Try to match career title to salary data
        const careerTitle = career ? career.title : '';
        let matchedData = null;
        if (careerTitle) {
            const key = Object.keys(salaryData).find(k =>
                k.toLowerCase() === careerTitle.toLowerCase() ||
                careerTitle.toLowerCase().includes(k.toLowerCase())
            );
            if (key) matchedData = salaryData[key];
        }

        let baseMonthly;
        if (matchedData) {
            // Parse "X-Y LPA" format → take midpoint → convert to monthly
            const parts = matchedData.entry.split('-');
            const entryLPA = (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
            baseMonthly = Math.floor((entryLPA * 100000) / 12);
        } else {
            baseMonthly = 25000; // true fallback only if no match
        }

        const growth = career?.title?.toLowerCase().includes('data') ||
                       career?.title?.toLowerCase().includes('machine') ? 1.18 :
                       career?.title?.toLowerCase().includes('developer') ||
                       career?.title?.toLowerCase().includes('engineer') ? 1.15 : 1.12;

        const multiplier = Math.pow(growth, parseInt(year));
        const projected = Math.floor(baseMonthly * multiplier);
        const stability = projected > 80000 ? 'High' : projected > 50000 ? 'Moderate' : 'Low';

        res.json({
            year: parseInt(year),
            projectedSalary: `₹${projected.toLocaleString()}`,
            marketStability: stability,
            riskLevel: projected > 80000 ? 'Low' : 'Moderate',
            note: 'fallback'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get User Profile
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());
        const user = await User.findById(decoded.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(401).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : 'Invalid token' });
    }
});

// Update Profile
router.put('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());
        const updates = req.body;

        // Enhanced AI Simulation
        if (updates.skills && updates.skills.length > 0) {
            updates.careerReadiness = Math.min(updates.skills.length * 20, 95);
            updates.unemploymentRisk = Math.max(80 - (updates.skills.length * 15), 5);
        }

        const user = await User.findByIdAndUpdate(decoded.id, updates, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Select a Career Path
router.post('/select-path', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());

        const { careerId, title } = req.body;
        const user = await User.findByIdAndUpdate(decoded.id, {
            selectedCareer: { careerId, title }
        }, { new: true });

        res.json({ message: `Path ${title} selected successfully`, user });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Get Explainable Risk Analysis
router.get('/risk-analysis', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());
        const user = await User.findById(decoded.id);
        const axios = require('axios');
        const ML_URL = process.env.ML_URL || 'http://localhost:8000';

        let mlRisk = { level: "Low", score: 10, factors: [] };
        try {
            const ml_res = await axios.post(`${ML_URL}/risk`, {
                state: user.location || 'Urban',
                education_level: user.education?.qualification || 'Bachelor',
                skill_gap_score: (100 - (user.careerReadiness || 50)) / 100
            });
            mlRisk = { level: ml_res.data.risk_level, score: ml_res.data.risk_score, factors: ml_res.data.factors };
        } catch (ml_err) {
            console.error("ML Service Error (Risk):", ml_err.message);
        }

        let riskScore = mlRisk.score;
        let factors = mlRisk.factors || [];
        let mitigation = [];

        if (user.selectedCareer && user.selectedCareer.title) {
            factors.push(`Risk analyzed for path: ${user.selectedCareer.title}`);
            // Add some "simulation" logic for the path
            if (user.skills.length < 5) {
                riskScore += 10;
                factors.push(`Limited skills for ${user.selectedCareer.title}`);
                mitigation.push(`Acquire more skills related to ${user.selectedCareer.title}`);
            }
        } else {
            factors.push("No specific career path selected");
            mitigation.push("Select a career path in 'Insights' for better analysis");
        }

        if (user.isPlaced) {
            riskScore = Math.max(riskScore - 20, 5);
            factors.push("User is already placed (Lower Risk)");
        }

        res.json({
            score: Math.min(Math.round(riskScore), 100),
            level: riskScore > 60 ? 'High' : (riskScore > 30 ? 'Moderate' : 'Low'),
            factors,
            mitigation: mitigation.length > 0 ? mitigation : ["Continue learning", "Update profile weekly"]
        });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Get Detailed Roadmap for a Career
router.get('/roadmap/:careerId', async (req, res) => {
    try {
        const Career = require('../models/Career');
        const career = await Career.findById(req.params.careerId);
        if (!career) return res.status(404).json({ message: 'Career not found' });
        res.json(career.roadmap);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Get External Opportunities (Skill India Digital)
router.get('/external-opportunities', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());
        const user = await User.findById(decoded.id);

        const axios = require('axios');
        const ML_URL = process.env.ML_URL || 'http://localhost:8000';

        try {
            const ml_res = await axios.post(`${ML_URL}/opportunities/external`, {
                skills: user.skills || [],
                education: user.education?.qualification || 'Graduate'
            });
            res.json(ml_res.data.opportunities);
        } catch (ml_err) {
            console.error("ML External Opps Error:", ml_err.message);
            res.json([]);
        }
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

const Application = require('../models/Application');
const Job = require('../models/Job');

// Apply to a Job
router.post('/apply/:jobId', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());

        const user = await User.findById(decoded.id);
        const job = await Job.findById(req.params.jobId);

        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Check if already applied
        const existingApp = await Application.findOne({ jobId: job._id, userId: user._id });
        if (existingApp) return res.status(400).json({ message: 'Already applied' });

        const application = new Application({
            jobId: job._id,
            userId: user._id,
            employerId: job.employerId || null, // Some jobs might be posted by admin
            status: 'Applied',
            resumeSnapshot: user.resume?.url || null,
            matchScore: job.matchScore || 0 // Use existing score if available
        });

        await application.save();

        // Update job applicant count
        await Job.findByIdAndUpdate(job._id, { $inc: { applicantsCount: 1 } });

        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Get My Applications
router.get('/my-applications', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());

        const applications = await Application.find({ userId: decoded.id })
            .populate('jobId', 'title company location status')
            .sort({ appliedAt: -1 });

        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// --- CONSULTANT INTEGRATION ---
const Consultant = require('../models/Consultant');
const Session = require('../models/Session');
const Payment = require('../models/Payment');

// Get Approved Consultants with Filters
router.get('/consultants/list', async (req, res) => {
    try {
        const { expertise, minFee, maxFee, rating } = req.query;
        let query = { status: 'approved' };

        if (expertise) query.expertise = { $in: [expertise] };
        if (minFee || maxFee) {
            query.fee = {};
            if (minFee) query.fee.$gte = parseInt(minFee);
            if (maxFee) query.fee.$lte = parseInt(maxFee);
        }
        if (rating) query.rating = { $gte: parseFloat(rating) };

        const consultants = await Consultant.find(query).populate('userId', 'name email location');
        res.json(consultants);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Book a Session (Initiate Payment Order)
router.post('/book-session', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());

        const { consultantId, startTime, mode, duration, amount } = req.body;

        if (amount === 0) {
            const session = new Session({
                userId: decoded.id,
                consultantId,
                slot: { startTime, duration: duration || 45 },
                mode,
                status: 'scheduled',
                amount: 0
            });
            await session.save();
            return res.status(201).json({ skipPayment: true, sessionId: session._id });
        }

        // Create Razorpay Order
        const options = {
            amount: amount * 100, // amount in the smallest currency unit (paise)
            currency: "INR",
            receipt: "order_rcptid_" + Math.floor(Date.now() / 1000)
        };

        const Session = require('../models/Session');
        const session = new Session({
            userId: decoded.id,
            consultantId,
            slot: { startTime, duration: duration || 45 },
            mode,
            status: 'pending-payment',
            amount
        });

        let orderId, amount_val, currency_val, keyId_val;
        try {
            const order = await razorpay.orders.create(options);
            orderId = order.id;
            amount_val = order.amount;
            currency_val = order.currency;
            keyId_val = process.env.RAZORPAY_KEY_ID;
            
            session.razorpayOrderId = orderId;
            await session.save();
        } catch (rzpErr) {
            // Demo fallback — skip payment, book directly
            console.warn('Razorpay unavailable, using demo booking:', rzpErr.message);
            session.status = 'scheduled';
            session.razorpayOrderId = 'DEMO-' + Date.now();
            await session.save();
            return res.json({
                skipPayment: true,
                sessionId: session._id,
                message: 'Session booked successfully (Demo Mode — payment skipped)'
            });
        }

        return res.json({
            orderId,
            amount: amount_val,
            currency: currency_val,
            keyId: keyId_val,
            sessionId: session._id
        });
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Verify Payment
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder');
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpay_signature) {
            // Payment successful
            const session = await Session.findOne({ razorpayOrderId: razorpay_order_id });
            if (session) {
                session.status = 'scheduled';
                session.razorpayPaymentId = razorpay_payment_id;

                const payment = new Payment({
                    userId: session.userId,
                    consultantId: session.consultantId,
                    amount: session.amount || 500, // Amount should be passed or fetched
                    status: 'success',
                    transactionId: razorpay_payment_id,
                    sessionId: session._id
                });
                await payment.save();
                session.paymentId = payment._id;
                await session.save();

                res.json({ message: 'Payment verified successfully', sessionId: session._id });
            } else {
                res.status(404).json({ message: 'Session not found' });
            }
        } else {
            res.status(400).json({ message: 'Invalid signature' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});


// Get My Consultation Sessions
router.get('/my-sessions', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());

        const sessions = await Session.find({ userId: decoded.id })
            .populate({
                path: 'consultantId',
                populate: { path: 'userId', select: 'name email' }
            })
            .sort({ 'slot.startTime': -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ message: err.message === 'JWT_SECRET not set' ? 'Server misconfiguration' : err.message });
    }
});

// Emotion Check
router.post('/emotion-check', async (req, res) => {
    try {
        const { text } = req.body;
        const axios = require('axios');
        const ML_URL = process.env.ML_URL || 'http://localhost:8000';

        const ml_res = await axios.post(`${ML_URL}/analyze-emotion`, { text });
        res.json(ml_res.data);
    } catch (err) {
        console.error("Emotion Check Error:", err.message);
        res.status(500).json({ message: 'Emotion check failed' });
    }
});

// --- AI ASSISTANT CHAT (Gemini API Fallback) ---
router.post('/chat', async (req, res) => {
    try {
        const { message, userContext } = req.body;
        if (!process.env.GEMINI_API_KEY) return res.json({ reply: "API Key not configured. Ask me about resumes or skill gaps!" });

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            User Message: "${message}"
            User Context: ${JSON.stringify(userContext || {})}
            You are "CareerBridge-AI", a professional assistant for Indian students and job seekers. 
            Provide career advice, resume tips, or skill guidance. 
            Respond in a premium, helpful tone using a mix of English and Hindi (Hinglish).
            Keep it concise (2-3 sentences). Mention Skill India Digital or NPTEL if relevant.
        `;

        const result = await model.generateContent(prompt);
        res.json({ reply: result.response.text() });
    } catch (err) {
        res.status(500).json({ reply: "Main abhi thoda busy hoon. Aap questions, skill gap ya resume ke baare mein puchiye!" });
    }
});

// AI Interview Evaluation with Gemini Fallback
router.post('/interview/evaluate', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_placeholder');

        const { role, question, answer } = req.body;
        const axios = require('axios');
        const ML_URL = process.env.ML_URL || 'http://localhost:8000';

        let result;
        try {
            // Priority 1: ML FastAPI Service
            const ml_res = await axios.post(`${ML_URL}/evaluate-interview-answer`, { role, question, answer });
            result = ml_res.data;
        } catch (ml_err) {
            // Priority 2: Gemini API Fallback
            console.log("ML Evaluation failed, falling back to Gemini...");
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const evalPrompt = `
                Role: ${role} | Question: ${question} | Candidate Answer: ${answer}
                Evaluate the answer for an Indian job interview. Provide:
                1. Score (0-100)
                2. Constructive feedback (Concise)
                3. List of 2 improvement areas.
                Return ONLY valid JSON: {"score": 80, "feedback": "...", "improvement_areas": ["...", "..."]}
            `;
            const geminiRes = await model.generateContent(evalPrompt);
            const text = geminiRes.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            result = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 50, feedback: "Good effort! Try to be more descriptive.", improvement_areas: ["Technical depth", "Confidence"] };
        }

        const user = await User.findById(decoded.id);
        if (user) {
            if (!user.interviewHistory) user.interviewHistory = [];
            user.interviewHistory.push({ role, question, score: result.score, feedback: result.feedback, date: new Date() });
            await user.save();
        }

        res.json(result);
    } catch (err) {
        console.error("Interview Evaluation Error:", err.message);
        res.status(500).json({ message: 'Evaluation failed' });
    }
});

// ─── DYNAMIC INTERVIEW QUESTIONS (Gemini API) ────────────────────────────────
router.post('/interview/generate-questions', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());
        const user = await User.findById(decoded.id);

        const { career, difficulty } = req.body;
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const userSkills = user?.skills?.join(', ') || 'Fresher';
        const userEdu = user?.education?.qualification || 'Graduate';

        const prompt = `
Generate exactly 5 interview questions for a ${career} role in India (2025-26 job market).
Candidate profile: Skills: ${userSkills} | Education: ${userEdu} | Difficulty: ${difficulty || 'Medium'}

Structure:
1. One 'Tell me about yourself' for ${career}.
2. Two technical questions specific to ${career}.
3. One situational/behavioral question (e.g., handling failure or conflict).
4. One growth-mindset question.

Return ONLY a valid JSON array, no markdown:
[
  {"id":1,"question":"...","type":"behavioral","hint":"..."},
  {"id":2,"question":"...","type":"technical","hint":"..."},
  {"id":3,"question":"...","type":"technical","hint":"..."},
  {"id":4,"question":"...","type":"situational","hint":"..."},
  {"id":5,"question":"...","type":"mindset","hint":"..."}
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        res.json({ questions, career });
    } catch (err) {
        console.error('Question Generation Error:', err.message);
        res.status(500).json({ message: 'Question generation failed', error: err.message });
    }
});

// ─── AI ROADMAP GENERATOR (Gemini API — India Specific) ──────────────────────
router.post('/roadmap/generate', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })());
        const user = await User.findById(decoded.id);

        const { career } = req.body;
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const userSkills = user?.skills?.join(', ') || 'Beginner';
        const userEdu = user?.education?.qualification || 'Graduate';

        const prompt = `
Create a 4-phase learning roadmap (6 months total) for someone in India who wants to become a ${career}.
Current profile: Skills: ${userSkills} | Education: ${userEdu}

Rules:
- Use ONLY FREE Indian resources: NPTEL (nptel.ac.in), SWAYAM (swayam.gov.in), Kaggle (kaggle.com/learn), freeCodeCamp, GeeksForGeeks, YouTube
- All salaries in INR (Indian 2025 market)
- Mention real Indian companies hiring this role
- Each phase must have 3-5 resources with real working links

Return ONLY a valid JSON array, no markdown, no extra text:
[
  {
    "phase": "Phase 1: Foundation",
    "duration": "Month 1-2",
    "skills": ["skill1","skill2","skill3"],
    "milestone": "What you can build/do after completing this phase",
    "resources": [
      {"title":"Course Name","link":"https://actual-link.com","platform":"NPTEL","isFree":true}
    ]
  }
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const roadmap = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        // Save to user profile — cache karo taaki baar baar API call na ho
        await User.findByIdAndUpdate(decoded.id, {
            'selectedCareer.title': career,
            generatedRoadmap: roadmap
        });

        res.json({ roadmap, career });
    } catch (err) {
        console.error('Roadmap Generation Error:', err.message);
        const fallbackRoadmap = [
            {
                "phase": "Phase 1: Foundation",
                "duration": "Month 1",
                "skills": ["Basic Concepts", "Industry Overview"],
                "milestone": "Identify core interests",
                "resources": [
                    { "title": "Introduction to Career", "link": "https://swayam.gov.in", "platform": "SWAYAM", "isFree": true }
                ]
            },
            {
                "phase": "Phase 2: Skill Acquisition",
                "duration": "Month 2-4",
                "skills": ["Core Technical Skills", "Tool Basics"],
                "milestone": "Build foundational projects",
                "resources": [
                    { "title": "Core Technical Course", "link": "https://nptel.ac.in", "platform": "NPTEL", "isFree": true }
                ]
            },
            {
                "phase": "Phase 3: Advanced Training",
                "duration": "Month 5-6",
                "skills": ["Advanced Concepts", "Portfolio Building"],
                "milestone": "Complete professional portfolio",
                "resources": [
                    { "title": "Professional Specialization", "link": "https://kaggle.com/learn", "platform": "Kaggle", "isFree": true }
                ]
            }
        ];
        res.json({ roadmap: fallbackRoadmap, career, fallback: true });
    }
});

module.exports = router;