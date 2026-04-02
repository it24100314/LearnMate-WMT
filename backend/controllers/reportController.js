const reportService = require('../services/reportService');

/**
 * Get Attendance Report (PDF)
 */
const getAttendanceReportPDF = async (req, res) => {
  try {
    // Only ADMIN can access reports
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can access reports' });
    }

    const pdfBuffer = await reportService.generateAttendanceReportPDF();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Attendance Report (CSV)
 */
const getAttendanceReportCSV = async (req, res) => {
  try {
    // Only ADMIN can access reports
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can access reports' });
    }

    const csvData = await reportService.generateAttendanceReportCSV();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
    res.send(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Marks Report (PDF)
 */
const getMarksReportPDF = async (req, res) => {
  try {
    // Only ADMIN can access reports
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can access reports' });
    }

    const pdfBuffer = await reportService.generateMarksReportPDF();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=marks-report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Marks Report (CSV)
 */
const getMarksReportCSV = async (req, res) => {
  try {
    // Only ADMIN can access reports
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can access reports' });
    }

    const csvData = await reportService.generateMarksReportCSV();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=marks-report.csv');
    res.send(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Fees Report (PDF)
 */
const getFeesReportPDF = async (req, res) => {
  try {
    // Only ADMIN can access reports
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can access reports' });
    }

    const pdfBuffer = await reportService.generateFeesReportPDF();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=fees-report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Fees Report (CSV)
 */
const getFeesReportCSV = async (req, res) => {
  try {
    // Only ADMIN can access reports
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can access reports' });
    }

    const csvData = await reportService.generateFeesReportCSV();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fees-report.csv');
    res.send(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAttendanceReportPDF,
  getAttendanceReportCSV,
  getMarksReportPDF,
  getMarksReportCSV,
  getFeesReportPDF,
  getFeesReportCSV
};
