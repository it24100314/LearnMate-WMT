const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Main dashboard route - routes based on role
router.get('/', getDashboard);

// Role-specific dashboards
router.get('/admin', getAdminDashboard);
router.get('/teacher', getTeacherDashboard);
router.get('/student', getStudentDashboard);

module.exports = router;

