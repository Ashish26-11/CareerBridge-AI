const User = require('../models/User');

// GET /api/network - Get suggested connections
exports.getConnections = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        
        // Find users with similar skills or in the same location
        const suggestions = await User.find({
            _id: { $ne: req.user.id },
            role: 'user',
            $or: [
                { skills: { $in: currentUser.skills || [] } },
                { location: currentUser.location }
            ]
        }).limit(10).select('name skills location education');

        res.json({
            success: true,
            count: suggestions.length,
            data: suggestions
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching suggestions', error: error.message });
    }
};

// POST /api/network/connect - Send request
exports.connect = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'User ID required' });

        // Mock logic: Just return success for now
        res.json({
            success: true,
            message: 'Connection request sent successfully',
            targetUserId: userId
        });
    } catch (error) {
        res.status(500).json({ message: 'Error sending request', error: error.message });
    }
};

// GET /api/network/feed - Mock professional feed
exports.getFeed = async (req, res) => {
    try {
        const feed = [
            {
                id: 1,
                user: "Rahul Sharma",
                action: "completed a certification",
                detail: "Advanced Python for Data Science",
                time: "2 hours ago",
                likes: 24
            },
            {
                id: 2,
                user: "Priya Patel",
                action: "started a new job at",
                detail: "TechCorp India as Junior Developer",
                time: "5 hours ago",
                likes: 56
            },
            {
                id: 3,
                user: "CareerBridge AI",
                action: "matched a new opportunity",
                detail: "15 new Full Stack roles in Bangalore",
                time: "1 day ago",
                likes: 120
            }
        ];

        res.json({
            success: true,
            data: feed
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feed', error: error.message });
    }
};
