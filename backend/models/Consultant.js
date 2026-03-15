const mongoose = require('mongoose');

const consultantSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expertise: [{ type: String }],
    experience: { type: Number, required: true },
    languages: [{ type: String }],
    fee: { type: Number, required: true },
    bio: { type: String },
    availability: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        slots: [{
            start: String, // e.g., "09:00"
            end: String    // e.g., "09:45"
        }]
    }],
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Consultant', consultantSchema);
