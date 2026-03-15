const User = require('../models/User');
const zeroResumeBuilder = require('../services/zeroResumeBuilder');

// Get questions for zero-resume flow
exports.getQuestions = async (req, res) => {
    try {
        const questions = zeroResumeBuilder.getQuestions();
        
        res.json({
            success: true,
            data: questions
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({
            message: 'Error fetching questions',
            error: error.message
        });
    }
};

// Build profile from answers
exports.buildProfile = async (req, res) => {
    try {
        const answers = req.body;

        if (!answers || Object.keys(answers).length === 0) {
            return res.status(400).json({
                message: 'Answers are required'
            });
        }

        // Build profile using AI
        const profile = await zeroResumeBuilder.buildProfile(answers);

        res.json({
            success: true,
            message: 'Profile created successfully from your answers!',
            data: profile
        });

    } catch (error) {
        console.error('Profile building error:', error);
        res.status(500).json({
            message: 'Error building profile',
            error: error.message
        });
    }
};

// Save zero-resume profile to database
exports.saveProfile = async (req, res) => {
    try {
        const profileData = req.body;

        // Create new user with zero-resume profile
        const user = await User.create({
            ...profileData,
            password: 'temp_' + Date.now(), // Temporary password
            role: 'user'
        });

        res.json({
            success: true,
            message: 'Profile saved! You can now find jobs.',
            data: {
                userId: user._id,
                name: user.name
            }
        });

    } catch (error) {
        console.error('Profile save error:', error);
        res.status(500).json({
            message: 'Error saving profile',
            error: error.message
        });
    }
};