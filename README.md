# 🎓 LearnMate System
### Full-Stack Mobile Educational Institute Management System

LearnMate is a comprehensive, cross-platform mobile application designed to streamline administrative, academic, and financial operations for modern educational institutes. Built with a robust Node.js backend and a high-performance React Native frontend, it provides a seamless experience for Admins, Teachers, and Students.

---

## 🚀 Live Links
- **📱 Download Android APK:** [Click here to download from Google Drive]`https://mysliit-my.sharepoint.com/:f:/g/personal/it24102009_my_sliit_lk/IgAP1G6GYPbARLAZFJy6T0VYARpSmBylN_7NSQpLG89XTXM?e=SmSSib`
- **🌐 Backend API (Render):** `https://learnmate-wmt.onrender.com/api`

---

## 🛠️ Tech Stack
- **Frontend:** React Native (Expo), Expo Router
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Authentication:** JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)
- **File Handling:** Multer (PDF Exam papers & Answer sheets)
- **Deployment:** Render (Backend), Expo Application Services (EAS)

---

## 👥 User Roles & Features

### 🔑 Admin
- **User Management:** Register and manage Students and Teachers.
- **Financial Oversight:** Manage fee records and verify payment slips.
- **Analytics:** Access high-level system-wide dashboard metrics.

### 🍎 Teacher
- **Academic Management:** Create exams and upload question papers.
- **Grading:** Download student answer sheets and publish marks.
- **Attendance:** Record and track daily student attendance.
- **Announcements:** Broadcast notifications to specific classes or subjects.

### 🎓 Student
- **Academic Hub:** View personalized timetables and upcoming exams.
- **Submissions:** Upload answer scripts directly via the mobile app.
- **Progress Tracking:** View published marks and attendance history.
- **Finance:** View outstanding fees and upload bank payment slips.

---

## 📂 Project Structure
- `/backend`: Express.js API, MongoDB models, and business logic.
- `/mobile`: React Native Expo application source code.
- `/docs`: Technical documentation, API tables, and architecture diagrams.

---

## 💻 Local Setup

1. **Clone the repo:** `git clone https://github.com/it24100314/LearnMate-WMT.git`
2. **Backend:**
   - `cd backend`
   - `npm install`
   - Create `.env` with `MONGO_URI` and `JWT_SECRET`
   - `node seed.js` (to populate initial data)
   - `npm start`
3. **Mobile:**
   - `cd mobile`
   - `npm install`
   - `npx expo start`
