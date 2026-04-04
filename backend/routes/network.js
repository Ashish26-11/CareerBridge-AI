const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const networkController = require('../controllers/networkController');

// Inline auth middleware — same pattern used in all other route files in this project
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set') })()
        );
        req.user = { id: decoded.id };
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

router.get('/', authMiddleware, networkController.getConnections);
router.post('/connect', authMiddleware, networkController.connect);
router.get('/feed', authMiddleware, networkController.getFeed);

module.exports = router;
