const Session = require('../models/Session');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('⚡ New socket connection:', socket.id);

        socket.on('join_session', ({ sessionId, userId }) => {
            socket.join(sessionId);
            console.log(`👤 User ${userId} joined session ${sessionId}`);
            socket.to(sessionId).emit('user_joined', { userId });
        });

        socket.on('send_message', async ({ sessionId, senderId, content }) => {
            try {
                // Persist message to MongoDB
                const session = await Session.findById(sessionId);
                if (session) {
                    session.messages.push({ senderId, content });
                    await session.save();

                    // Broadcast to others in the session
                    io.to(sessionId).emit('receive_message', {
                        senderId,
                        content,
                        timestamp: new Date()
                    });
                }
            } catch (err) {
                console.error('❌ Error saving message:', err.message);
            }
        });

        socket.on('signal', ({ sessionId, signalData }) => {
            // Forward WebRTC signals to the other party
            socket.to(sessionId).emit('signal', signalData);
        });

        socket.on('end_session', ({ sessionId }) => {
            socket.to(sessionId).emit('session_ended');
            console.log(`🏁 Session ${sessionId} ended`);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected:', socket.id);
        });
    });
};
