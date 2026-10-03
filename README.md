# StudyMate AI 🎓🤖

StudyMate AI is an AI-powered personal learning assistant designed to process study materials, generate custom quizzes, create interactive study plans, and answer questions.

## 🚀 1-Click Direct Deployment

Deploy the full stack directly to free hosting platforms:

### 1. Backend (Render)
[![Deploy to Render](https://render.com/images/deploy-to-render.svg)](https://render.com/deploy?repo=https://github.com/madhar-nayan/Studymate-ai)

### 2. Frontend (Vercel)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmadhar-nayan%2FStudymate-ai&root-directory=frontend&env=VITE_API_URL&envDescription=Your%20deployed%20Render%20backend%20API%20URL%20ending%20with%20%2Fapi)

---

## 🛠️ Project Structure

- `frontend/` - React 19 + Vite + Redux Toolkit + TailwindCSS v4
- `backend/` - Node.js + Express + MongoDB + Gemini AI + Cloudinary
- `render.yaml` - Render Infrastructure-as-Code Blueprint
- `docker-compose.yml` - Container orchestration configuration

---

## 📋 Required Environment Variables

### Backend Environment Variables
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (Default: `7d`)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY`
- `CLIENT_URL` (Your Vercel frontend URL)

### Frontend Environment Variables
- `VITE_API_URL` (Your Render backend URL + `/api`)
