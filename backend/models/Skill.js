const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: String,
    difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    relatedCareers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Career' }],
    demandScore: { type: Number, default: 0 }
});

module.exports = mongoose.model('Skill', skillSchema);
