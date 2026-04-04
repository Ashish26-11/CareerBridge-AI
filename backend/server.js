const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
    const atlasUri = process.env.MONGODB_URI;
    const localUri = 'mongodb://127.0.0.1:27017/employaiDB';

    console.log('📡 Initializing database connection...');

    try {
        // Try Atlas first
        await mongoose.connect(atlasUri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ Connected to MongoDB Atlas');
    } catch (atlasErr) {
        console.error('❌ MongoDB Atlas connection failed:', atlasErr.message);

        if (atlasErr.message.includes('MongooseServerSelectionError') || atlasErr.message.includes('whitelist')) {
            console.log('\n⚠️  ACTION REQUIRED: Your IP is not whitelisted in MongoDB Atlas.');
            console.log('👉 Login to https://cloud.mongodb.com/');
            console.log('👉 Go to Security > Network Access');
            console.log('👉 Click "Add IP Address" and select "Allow Access From Anywhere (0.0.0.0/0)" for the hackathon.\n');
        }

        console.log('🔄 Attempting fallback to local MongoDB...');
        try {
            await mongoose.connect(localUri);
            console.log('✅ Connected to local MongoDB');
        } catch (localErr) {
            console.error('❌ Local MongoDB also failed:', localErr.message);
            console.log('\n🛑 NO DATABASE REACHABLE.');
            console.log('💡 TIP: Start your local MongoDB service (e.g., `services.msc` on Windows).');
            console.log('💡 TIP: Add "0.0.0.0/0" to your Atlas Network Access for universal connectivity.');
        }
    }
};

connectDB();

// Basic Route
app.get('/', (req, res) => {
    res.send('CareerBridge-AI Backend is running');
});

// Import All Routes
const schemeRoutes = require('./routes/schemes');
const jobRoutes = require('./routes/jobs');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const employerRoutes = require('./routes/employer');
const publicRoutes = require('./routes/public');
const consultantRoutes = require('./routes/consultant');
const employabilityRoutes = require('./routes/employability');
const riskRoutes = require('./routes/riskRoutes'); // ✅ Added here with other imports
const simulationRoutes = require('./routes/simulationRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const networkRoutes = require('./routes/network');

// Use All Routes
app.use('/api/schemes', schemeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/consultants', consultantRoutes);
app.use('/api/employability', employabilityRoutes);
app.use('/api/risk', riskRoutes); // ✅ Moved here with other routes
app.use('/api/simulation', simulationRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/network', networkRoutes);

// Socket.io Integration
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

require('./socket/session-socket')(io);

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Risk Analysis API available at: http://localhost:${PORT}/api/risk/analyze`);
});