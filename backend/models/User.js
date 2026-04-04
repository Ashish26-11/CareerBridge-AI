const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'employer', 'consultant'], default: 'user' },
    userTrack: {
        type: String,
        enum: ['tech', 'non-tech', 'digital-business', 'agriculture'],
        default: 'tech'
    },
    company: {
        name: String,
        website: String,
        gst: String,
        logo: String,
        verified: { type: Boolean, default: false },
        isMSME: { type: Boolean, default: false }
    },
    location: String,
    age: Number,
    gender: String,
    education: {
        qualification: String,
        stream: String,
        year: Number
    },
    skills: [String],
    interests: [String],
    careerGoals: [String],
    experience: String,
    financialConstraints: {
        budget: Number,
        currency: { type: String, default: 'INR' }
    },
    careerReadiness: { type: Number, default: 0 },
    unemploymentRisk: { type: Number, default: 0 },
    employabilityScore: { type: Number, default: 0 },
    employabilityLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    appliedSchemes: [{
        schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme' },
        title: String,
        status: { type: String, default: 'Applied' },
        appliedAt: { type: Date, default: Date.now }
    }],
    isPlaced: { type: Boolean, default: false },
    savedCareers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Career' }],
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    learningProgress: [{
        skill: String,
        status: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
        lastUpdated: { type: Date, default: Date.now }
    }],
    lastActive: { type: Date, default: Date.now },
    resume: {
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    },
    selectedCareer: {
        title: String,
        careerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Career' }
    },
    interviewHistory: [{
        role: String,
        question: String,
        score: Number,
        feedback: String,
        date: { type: Date, default: Date.now }
    }],

    // ── NEW: AI Generated Roadmap Cache ──────────────────────────────────────
    // Gemini se generate hua roadmap yahan save hoga — baar baar API call nahi lagegi
    generatedRoadmap: [{ type: mongoose.Schema.Types.Mixed }]
    // ─────────────────────────────────────────────────────────────────────────
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);