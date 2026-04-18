const dashboardService = require('../services/dashboardService');

/**
 * Main Dashboard Routing
 * Routes users to their role-specific dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const user = req.currentUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let dashboardData;

    switch (user.role) {
      case 'ADMIN':
        dashboardData = await dashboardService.getAdminDashboard();
        break;
      case 'TEACHER':
        dashboardData = await dashboardService.getTeacherDashboard(user);
        break;
      case 'STUDENT':
        dashboardData = await dashboardService.getStudentDashboard(user);
        break;
      default:
        return res.status(403).json({ message: 'Unknown user role' });
    }

    res.json({
      role: user.role,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Admin Dashboard
 */
const getAdminDashboard = async (req, res) => {
  try {
    const user = req.currentUser;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can access this' });
    }

    const dashboardData = await dashboardService.getAdminDashboard();
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Teacher Dashboard
 */
const getTeacherDashboard = async (req, res) => {
  try {
    const user = req.currentUser;
    if (user.role !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can access this' });
    }

    const dashboardData = await dashboardService.getTeacherDashboard(user);
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Student Dashboard
 */
const getStudentDashboard = async (req, res) => {
  try {
    const user = req.currentUser;
    if (user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can access this' });
    }

    const dashboardData = await dashboardService.getStudentDashboard(user);
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard
};

