const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    salary: String,
    location: String,
    experience: String,
    description: String,
    type: { type: String, default: 'Full-time' },
    verified: { type: Boolean, default: false },
    postedBy: { type: String, default: 'Admin' },
    applyLink: String,
    skills: { type: [String], default: [] },
    matchScore: Number,
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Active', 'Closed'], default: 'Active' },
    applicantsCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);
