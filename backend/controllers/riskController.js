const User = require('../models/User');
const riskPredictor = require('../services/riskPredictor');

// Analyze unemployment risk for current user
exports.analyzeRisk = async (req, res) => {
    try {
        // Get user data
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Predict risk
        const riskAnalysis = await riskPredictor.predictRisk(user);

        // Update user's unemploymentRisk in database
        user.unemploymentRisk = riskAnalysis.riskScore;
        await user.save();

        res.json({
            success: true,
            data: riskAnalysis
        });

    } catch (error) {
        console.error('Risk Analysis Error:', error);
        res.status(500).json({ 
            message: 'Error analyzing unemployment risk',
            error: error.message 
        });
    }
};

// Get risk analysis for any user (admin only)
exports.getUserRisk = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const riskAnalysis = await riskPredictor.predictRisk(user);

        res.json({
            success: true,
            userId: user._id,
            userName: user.name,
            data: riskAnalysis
        });

    } catch (error) {
        console.error('Risk Analysis Error:', error);
        res.status(500).json({ 
            message: 'Error analyzing unemployment risk',
            error: error.message 
        });
    }
};