const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    slot: {
        startTime: { type: Date, required: true },
        duration: { type: Number, required: true, default: 45 } // in minutes
    },
    mode: { type: String, enum: ['video', 'audio', 'chat'], required: true },
    status: { type: String, enum: ['pending-payment', 'scheduled', 'completed', 'cancelled'], default: 'scheduled' },
    amount: { type: Number },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    notes: {
        suggestions: { type: String },
        skillImprovements: [{ type: String }],
        learningResources: [{ type: String }],
        resumeFeedback: { type: String }
    },
    messages: [{
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],
    recording: {
        url: { type: String },
        status: { type: String },
        duration: { type: Number }
    },
    aiSummary: {
        summary: { type: String },
        keyTopics: [{ type: String }],
        actionItems: [{ type: String }]
    },
    userRating: { type: Number, min: 1, max: 5 },
    userReview: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
