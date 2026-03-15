const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    eligibility: String,
    benefits: String,
    deadline: String,
    category: String,
    applyLink: String,
    incomeLimit: { type: Number, default: 0 },
    applicantsCount: { type: Number, default: 0 },
    convertedCount: { type: Number, default: 0 },
    dropOffCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Scheme', schemeSchema);
