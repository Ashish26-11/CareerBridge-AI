const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    salaryRange: {
        entry: String,
        mid: String
    },
    locationDemand: [String],
    skillsRequired: [String],
    stabilityScore: { type: Number, default: 0 },
    automationRisk: { type: Number, default: 0 },
    roadmap: [{
        phase: String,
        duration: String,
        skills: [String],
        resources: [{
            title: String,
            link: String,
            isFree: { type: Boolean, default: true }
        }]
    }]
});

module.exports = mongoose.model('Career', careerSchema);
