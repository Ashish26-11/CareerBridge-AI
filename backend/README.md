# CareerBridge-AI Backend

This is the backend for the CareerBridge-AI platform, providing data for government schemes, job matches, and AI-powered guidance.

## Prerequisites
- Node.js installed
- MongoDB Atlas account and cluster

## Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file in the `backend` directory (one has been created for you with placeholders):
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   ```

3. **Seed the Database**:
   The backend includes seed endpoints for convenience during the hackathon. Once the server is running, visit:
   - `http://localhost:5000/api/schemes/seed` - To populate government schemes.
   - `http://localhost:5000/api/jobs/seed` - To populate matching jobs.

4. **Start the Server**:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints
- `GET /api/schemes`: Fetch all government schemes.
- `GET /api/jobs`: Fetch all job matches.
