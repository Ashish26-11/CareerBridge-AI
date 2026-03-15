# 🚀 CareerBridge-AI Setup Guide

## ✅ Fixed Issues

### 1. Backend Error Fixed
**Problem:** `PathError: Missing parameter name at index 1: *`
**Solution:** Updated 404 handler in `server.js` to use Express 5 compatible syntax

```javascript
// OLD (causing error)
app.all('*', (req, res, next) => { ... });

// NEW (fixed)
app.all('/(.*)+', (req, res, next) => { ... });
```

### 2. Frontend Folders Merged
**Before:**
- `/frontend` - Modern React app
- `/frontend_legacy` - Old HTML files

**After:**
- `/frontend` - Main React app (Modern)
- `/frontend/public/legacy/` - Legacy HTML files (Backup)

---

## 📦 Project Structure

```
hackathon/
├── backend/              # Express + MongoDB Atlas + Socket.io
│   ├── config/          # Database, logger configs
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, error handling, security
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Background services
│   ├── socket/          # Real-time communication
│   └── server.js        # Entry point (FIXED ✅)
│
├── frontend/            # React + Vite (Main Frontend)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.jsx
│   └── public/
│       └── legacy/      # Old HTML files (Backup)
│
└── ml_service/          # Python ML service
    └── main.py
```

---

## 🛠️ Installation & Setup

### 1️⃣ Backend Setup

```bash
cd backend
npm install
```

**Environment Variables (.env):**
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Run Backend:**
```bash
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB Atlas
Server is running on port 5000
Socket.io is running on port 5000
```

---

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install
```

**Run Frontend:**
```bash
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

### 3️⃣ ML Service (Optional)

```bash
cd ml_service
pip install -r requirements.txt
python main.py
```

---

## 🔗 Access URLs

### Modern React App:
- **Main App:** http://localhost:5173/
- **Login:** http://localhost:5173/login
- **Dashboard:** http://localhost:5173/dashboard

### Legacy HTML Pages (Backup):
- **Legacy Home:** http://localhost:5173/legacy/index.html
- **Legacy Login:** http://localhost:5173/legacy/login.html
- **Legacy Dashboard:** http://localhost:5173/legacy/dashboard.html

### Backend API:
- **API Base:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/

---

## 🧪 Testing

### Backend Health:
```bash
curl http://localhost:5000/
# Expected: "CareerBridge-AI Backend is running safely 🛡️"
```

### MongoDB Connection:
Check backend console for:
```
✅ Connected to MongoDB Atlas
```

### API Test:
```bash
curl http://localhost:5000/api/public/health
```

---

## 🔧 Common Issues & Solutions

### Issue 1: Backend Won't Start
**Error:** `PathError: Missing parameter name`
**Solution:** ✅ Already fixed in `server.js` line 69

### Issue 2: MongoDB Connection Failed
**Solution:**
1. Check `.env` file has correct `MONGODB_URI`
2. Verify MongoDB Atlas IP whitelist
3. Check network connection

### Issue 3: Frontend Not Loading
**Solution:**
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### Issue 4: Port Already in Use
```bash
# Kill process on port 5000 (Backend)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port 5173 (Frontend)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

## 📚 API Endpoints

### Public Routes:
- `GET /api/public/health` - Health check
- `GET /api/public/schemes` - Government schemes

### User Routes:
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get profile

### Job Routes:
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job (Employer)

### Consultant Routes:
- `GET /api/consultants` - List consultants
- `POST /api/appointments` - Book appointment

### Real-time Features:
- Socket.io connection on `http://localhost:5000`
- Events: `consultation:message`, `consultation:join`

---

## 🎯 Next Steps

1. ✅ Backend error fixed
2. ✅ Frontend folders merged
3. ✅ Project structure organized
4. 🔄 Test all features
5. 🔄 Deploy to production

---

## 💡 Tips

- **Use React app** for development (better DX)
- **Legacy files** are in `/frontend/public/legacy/` for reference
- **MongoDB Atlas** connection already configured
- **Socket.io** enabled for real-time chat

---

## 📞 Support

If you face any issues:
1. Check backend console logs
2. Check frontend browser console
3. Verify MongoDB connection
4. Check `.env` variables

---

**Happy Coding! 🚀**
