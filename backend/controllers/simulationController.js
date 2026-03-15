const User = require('../models/User');
const careerSimulator = require('../services/careerSimulator');

// Simulate career path
exports.simulateCareer = async (req, res) => {
    try {
        const { skillToLearn, hoursPerWeek, budget } = req.body;

        if (!skillToLearn) {
            return res.status(400).json({ message: 'Skill to learn is required' });
        }

        // Get user data (if logged in)
        let userData = {};
        if (req.user) {
            const user = await User.findById(req.user.id);
            userData = user;
        } else {
            // For testing without auth
            userData = {
                skills: ['HTML', 'CSS'],
                education: { qualification: 'Graduate' },
                age: 22
            };
        }

        const simulationInput = {
            skillToLearn,
            hoursPerWeek: hoursPerWeek || 10,
            budget: budget || 0
        };

        const simulation = await careerSimulator.simulateCareer(userData, simulationInput);

        res.json({
            success: true,
            data: simulation
        });

    } catch (error) {
        console.error('Career simulation error:', error);
        res.status(500).json({
            message: 'Error simulating career path',
            error: error.message
        });
    }
};