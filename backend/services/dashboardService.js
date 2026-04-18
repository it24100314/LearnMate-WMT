const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');
const Mark = require('../models/Mark');
const Fee = require('../models/Fee');
const Notification = require('../models/Notification');

/**
 * Get Admin Dashboard Data
 * High-level system statistics and management
 */
const getAdminDashboard = async () => {
  try {
    const totalUsers = await User.countDocuments();
    const activeStudents = await User.countDocuments({ role: 'STUDENT', active: true });
    const totalTeachers = await User.countDocuments({ role: 'TEACHER', active: true });
    const totalClasses = await User.countDocuments({ role: 'STUDENT', active: true });

    // Fee statistics
    const feePaid = await Fee.countDocuments({ status: 'PAID' });
    const feePending = await Fee.countDocuments({ status: 'PENDING' });
    const feeOverdue = await Fee.countDocuments({ status: 'OVERDUE' });

    // Total revenue
    const paidFees = await Fee.find({ status: 'PAID' });
    const totalRevenue = paidFees.reduce((sum, fee) => sum + fee.amount, 0);

    // Attendance statistics
    const totalAttendanceRecords = await Attendance.countDocuments();
    const presentRecords = await Attendance.countDocuments({ present: true });
    const attendanceRate = totalAttendanceRecords > 0 
      ? ((presentRecords / totalAttendanceRecords) * 100).toFixed(2)
      : 0;

    // Exam statistics
    const totalExams = await Exam.countDocuments();

    // Low attendance alerts for students
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lowAttendanceStudents = await Attendance.aggregate([
      { $match: { date: { $gte: lastWeek }, student: { $exists: true } } },
      { $group: { 
          _id: '$student', 
          presentCount: { $sum: { $cond: ['$present', 1, 0] } },
          totalCount: { $sum: 1 }
        }
      },
      { $addFields: { 
          attendanceRate: { 
            $divide: ['$presentCount', '$totalCount'] 
          }
        }
      },
      { $match: { attendanceRate: { $lt: 0.75 } } },
      { $limit: 10 }
    ]);

    return {
      totalUsers,
      activeStudents,
      totalTeachers,
      totalClasses,
      feeStats: {
        paid: feePaid,
        pending: feePending,
        overdue: feeOverdue,
        totalRevenue
      },
      attendanceStats: {
        totalRecords: totalAttendanceRecords,
        presentRecords,
        attendanceRate: `${attendanceRate}%`
      },
      examStats: {
        total: totalExams
      },
      alerts: {
        lowAttendanceCount: lowAttendanceStudents.length
      }
    };
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    throw error;
  }
};

/**
 * Get Teacher Dashboard Data
 */
const getTeacherDashboard = async (teacher) => {
  try {
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new Error('Invalid teacher');
    }

    // Get classes taught by this teacher (students with teacher's subjects)
    const studentsWithTeacherSubjects = await User.find({
      role: 'STUDENT',
      subjects: { $in: teacher.subjects }
    }).select('_id name username schoolClass');

    const totalStudents = studentsWithTeacherSubjects.length;

    // Get exams created by this teacher
    const exams = await Exam.find({ createdBy: teacher._id });

    // Get marks entered by this teacher
    const marks = await Mark.find({ teacher: teacher._id });

    // Get attendance marked by this teacher
    const attendanceRecords = await Attendance.find({ markedBy: teacher._id });

    // Ungraded exams
    const ungradedMarks = await Mark.countDocuments({
      teacher: teacher._id,
      score: { $exists: false }
    });

    // Pending attendance marking (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingAttendance = await Attendance.countDocuments({
      markedBy: teacher._id,
      date: { $gte: today, $lt: tomorrow },
      present: null
    });

    return {
      teacherName: teacher.name,
      totalStudents,
      totalExams: exams.length,
      marksEntered: marks.length,
      attendanceRecorded: attendanceRecords.length,
      ungradedCount: ungradedMarks,
      pendingAttendance,
      recentExams: exams.slice(-5).reverse()
    };
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    throw error;
  }
};

/**
 * Get Student Dashboard Data
 */
const getStudentDashboard = async (student) => {
  try {
    if (!student || student.role !== 'STUDENT') {
      throw new Error('Invalid student');
    }

    // Attendance rate
    const attendanceRecords = await Attendance.find({ student: student._id });
    const presentDays = attendanceRecords.filter(a => a.present).length;
    const attendanceRate = attendanceRecords.length > 0 
      ? ((presentDays / attendanceRecords.length) * 100).toFixed(2)
      : 0;

    // Upcoming exams
    const today = new Date();
    const upcomingExams = await Exam.find({
      schoolClass: student.schoolClass,
      date: { $gte: today }
    }).sort({ date: 1 }).limit(5);

    // My marks
    const myMarks = await Mark.find({ student: student._id })
      .populate('exam', 'name date maxMarks')
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate average score
    let averageScore = 0;
    if (myMarks.length > 0) {
      const totalScore = myMarks.reduce((sum, m) => sum + (m.score || 0), 0);
      averageScore = (totalScore / myMarks.length).toFixed(2);
    }

    // Fee status
    const fees = await Fee.find({ student: student._id });
    const feePaid = fees.filter(f => f.status === 'PAID').length;
    const feePending = fees.filter(f => f.status === 'PENDING').length;
    const feeOverdue = fees.filter(f => f.status === 'OVERDUE').length;

    // Unread notifications
    const unreadNotifications = await Notification.countDocuments({
      $or: [
        { targetUser: student._id },
        { targetRole: 'STUDENT' },
        { targetClass: student.schoolClass }
      ],
      read: false
    });

    return {
      studentName: student.name,
      class: student.schoolClass?.name,
      attendanceRate: `${attendanceRate}%`,
      upcomingExams: upcomingExams.length,
      marksPublished: myMarks.length,
      averageScore: myMarks.length > 0 ? averageScore : 'N/A',
      feeStatus: {
        paid: feePaid,
        pending: feePending,
        overdue: feeOverdue
      },
      unreadNotifications,
      recentMarks: myMarks.slice(0, 5)
    };
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    throw error;
  }
};

module.exports = {
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard
};

