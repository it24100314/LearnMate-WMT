# WMT Project - Deployment & Setup Guide

## Overview
All missing features from the original Spring Boot project have been implemented in the Node.js backend. This includes:
- ✅ Report Generation (PDF/CSV exports)
- ✅ Dashboard analytics for Admin, Teacher, and Student roles
- ✅ API endpoints

## Initial Setup & Seeding

Before your first run, you should seed the database with subjects, classes, sample data, and core users.

```bash
cd backend
npm install
node seed.js
```

This will automatically create test users for you to log in with:
- **Admin**: `admin@` / `Admin@123`
- **Teacher**: `teacher@` / `Teacher@123`
- **Student**: `student@` / `Student@123`

---

## Files to Push to Render

### NEW Files (Created)
```
backend/services/dashboardService.js
backend/services/reportService.js
backend/controllers/dashboardController.js
backend/controllers/reportController.js
backend/routes/dashboardRoutes.js
backend/routes/reportRoutes.js
```

### MODIFIED Files
```
backend/models/User.js                    # Added 2 new roles
backend/server.js                         # Added 2 new route imports
backend/package.json                      # Added pdfkit & csv-stringify
```

---

## Deployment Steps

### 1. Install New Dependencies
```bash
cd backend
npm install
```

This will install:
- `pdfkit@^0.13.0` - PDF generation
- `csv-stringify@^6.4.6` - CSV export

### 2. Push All Changes to Git
```bash
git add backend/
git commit -m "feat: Add Report Generation and Dashboard Analytics

- Implement DashboardService with role-specific dashboards
- Implement ReportService for PDF/CSV generation
- Add DashboardController and ReportController
- Add dashboardRoutes.js and reportRoutes.js
- Update server.js to mount new routes
- Add pdfkit and csv-stringify dependencies"

git push origin main
```

### 3. Deploy to Render
```bash
# If using automatic deployments, Render will:
# 1. Pull latest code
# 2. Run: npm install (installs new packages)
# 3. Restart server (uses package.json start script)
```

Or manually trigger deployment in Render Dashboard:
- Navigate to your Backend Service
- Go to "Manual Deploy" → "Deploy latest commit"

---

## API Endpoints (New)

### Default Admin Credentials (for local testing/seeding)
If you run `node backend/seed.js`, these users are created:
- **Admin**: `admin@` / `Admin@123`
- **Teacher**: `teacher@` / `Teacher@123`
- **Student**: `student@` / `Student@123`

### Dashboard Endpoints
All require JWT token in `Authorization: Bearer <token>` header

**Main Dashboard** (Auto-routes by user role)
```
GET /api/dashboard/
Response: { role: string, data: object }
```

**Admin Dashboard**
```
GET /api/dashboard/admin
```
Returns: totalUsers, activeStudents, totalTeachers, feeStats, attendanceStats

**Teacher Dashboard**
```
GET /api/dashboard/teacher
```
Returns: teacherName, totalStudents, totalExams, marksEntered, ungradedCount, etc.

**Student Dashboard**
```
GET /api/dashboard/student
```
Returns: attendanceRate, upcomingExams, averageScore, feeStatus, unreadNotifications

---

### Report Endpoints
All require JWT token + ADMIN or DIRECTOR role

**Attendance Report**
```
GET /api/reports/attendance/pdf    # Download PDF
GET /api/reports/attendance/csv    # Download CSV
```

**Marks Report**
```
GET /api/reports/marks/pdf         # Download PDF
GET /api/reports/marks/csv         # Download CSV
```

**Fees Report**
```
GET /api/reports/fees/pdf          # Download PDF
GET /api/reports/fees/csv          # Download CSV
```

---

## Testing the New Features

### 1. Test Dashboard Endpoints
```bash
# Get your JWT token from login
TOKEN="your_jwt_token_here"

# Test Student Dashboard
curl -H "Authorization: Bearer $TOKEN" \
  https://learnmate-wmt-project.onrender.com/api/dashboard/

# Test Admin Dashboard
curl -H "Authorization: Bearer $TOKEN" \
  https://learnmate-wmt-project.onrender.com/api/dashboard/admin
```

### 2. Test Report Generation
```bash
# Download attendance PDF report
curl -H "Authorization: Bearer $TOKEN" \
  https://learnmate-wmt-project.onrender.com/api/reports/attendance/pdf \
  -o attendance-report.pdf

# Download marks CSV report
curl -H "Authorization: Bearer $TOKEN" \
  https://learnmate-wmt-project.onrender.com/api/reports/marks/csv \
  -o marks-report.csv
```

### 3. Create Additional Test Users
If you want to manually create more admins via the Node REPL or MongoDB:
```javascript
{
  username: "admin2",
  email: "admin2@school.com",
  name: "System Admin 2",
  password: "HashedPassword",  // Will be hashed by pre-save hook
  role: "ADMIN",
  active: true
}
```

---

## Mobile App Updates Needed

The mobile app will need updates to use the new dashboards:

### 1. Update Dashboard Screens to Use New API
**File:** `mobile/app/(tabs)/student-dashboard.tsx`
```typescript
// Change from hardcoded data to API call
const response = await api.get('/dashboard/');
setStats(response.data.data);
```

### 2. Add Report Download Feature
Create a new screen for report export (optional but recommended)

### 3. Add Support Officer Dashboard Screen
Create new screen for support officer role

---

## Features Implemented

### ✅ FR8: Report Generation
- Attendance reports (PDF/CSV)
- Marks reports (PDF/CSV)
- Fee reports (PDF/CSV)
- All with proper data formatting and summaries

### ✅ Analytics Dashboards
- Admin: System overview & fee collection
- Teacher: Student count, exams, marks, attendance
- Student: Personal attendance, exams, marks, fees
- Director: High-level metrics & alerts ⭐
- Support Officer: At-risk student detection ⭐

### ✅ Security
- All endpoints require JWT authentication
- Role-based access control enforced
- Detailed error messages
- Proper HTTP status codes

### ✅ Database
- No new migrations needed
- Uses existing models
- Aggregation queries for analytics

---

## Troubleshooting

### Issue: "pdfkit module not found"
**Solution:** Ensure `npm install` was run after pulling changes
```bash
cd backend
npm install
npm start
```

### Issue: "Unauthorized - only admin/director can access"
**Solution:** Login with an ADMIN or DIRECTOR account, then use their token

### Issue: "Student Support Officer role not available in registration"
**Solution:** This is by design. These roles can only be created by admins via direct database entry or admin panel

### Issue: Reports show no data
**Solution:** Ensure attendance/marks/fees records exist in database before generating reports

---

## Performance Notes

- Dashboard queries use MongoDB aggregation for efficiency
- PDF generation is CPU-intensive; consider caching for very large datasets
- CSV generation is lightweight and fast
- All endpoints include proper error handling

---

## Future Enhancements

1. **Online Payment Gateway** (FR5 enhancement)
   - Razorpay/Stripe integration
   - Real-time payment status updates

2. **Report Scheduling**
   - Automated report generation
   - Email delivery of reports

3. **Advanced Analytics**
   - Charts/graphs in API responses
   - Trend analysis
   - Predictive alerts

4. **SMS/Email Notifications**
  - Alert students of low attendance
   - Fee payment reminders
   - Mark notifications

---

## Questions?

Refer to the implementation summary in the session memory for full details:
- Service layer logic
- Database models used
- Authorization rules
- API response formats
