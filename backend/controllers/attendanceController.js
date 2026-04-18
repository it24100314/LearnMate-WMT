const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const SchoolClass = require('../models/SchoolClass');
const Subject = require('../models/Subject');
const { parseIsoDate, toDateOnlyString } = require('../utils/timeUtils');

const ATTENDANCE_POPULATE = [
  { path: 'student', select: 'name username email role schoolClass subjects' },
  { path: 'teacher', select: 'name username email role' },
  { path: 'subject', select: 'name' },
  { path: 'schoolClass', select: 'name' },
  { path: 'timetable', select: 'title day startTime endTime room' },
];

const hydrateAttendance = async (query) => {
  let chain = query;
  ATTENDANCE_POPULATE.forEach((entry) => {
    chain = chain.populate(entry);
  });
  return chain;
};

const resolveClassesForTeacher = async (teacherId) => {
  const timetables = await Timetable.find({ teacher: teacherId }).populate('schoolClass', 'name');
  const seen = new Set();
  const classes = [];

  timetables.forEach((entry) => {
    if (!entry.schoolClass?._id) return;
    const key = String(entry.schoolClass._id);
    if (!seen.has(key)) {
      seen.add(key);
      classes.push(entry.schoolClass);
    }
  });

  if (classes.length === 0) {
    return SchoolClass.find().sort({ name: 1 });
  }

  return classes.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
};

const getClassHistory = async (schoolClassId) => {
  const classStudents = await User.find({ schoolClass: schoolClassId }).select('_id');
  const studentIds = classStudents.map((student) => student._id);

  const history = await hydrateAttendance(
    Attendance.find({
      $or: [
        { schoolClass: schoolClassId },
        { schoolClass: null, student: { $in: studentIds } },
      ],
    }).sort({ date: -1, _id: -1 })
  );

  return history;
};

const getAttendancesForClasses = async (classIds) => {
  const seen = new Set();
  const combined = [];

  for (const classId of classIds) {
    const classHistory = await getClassHistory(classId);
    classHistory.forEach((attendance) => {
      const id = String(attendance._id);
      if (!seen.has(id)) {
        seen.add(id);
        combined.push(attendance);
      }
    });
  }

  return combined;
};

const loadAttendancesForUser = async (currentUser) => {
  if (!currentUser || !currentUser.role) {
    return hydrateAttendance(Attendance.find().sort({ date: -1, _id: -1 }));
  }

  if (currentUser.role === 'ADMIN') {
    return hydrateAttendance(Attendance.find().sort({ date: -1, _id: -1 }));
  }

  if (currentUser.role === 'TEACHER') {
    const classes = await resolveClassesForTeacher(currentUser._id);
    const classIds = classes.map((schoolClass) => schoolClass._id);
    const classAttendances = await getAttendancesForClasses(classIds);
    if (classAttendances.length > 0) {
      return classAttendances;
    }

    return hydrateAttendance(
      Attendance.find({ teacher: currentUser._id }).sort({ date: -1, _id: -1 })
    );
  }

  if (currentUser.role === 'STUDENT') {
    return hydrateAttendance(
      Attendance.find({ student: currentUser._id }).sort({ date: -1, _id: -1 })
    );
  }

  return hydrateAttendance(Attendance.find().sort({ date: -1, _id: -1 }));
};

const resolveClassOptions = async (currentUser) => {
  if (!currentUser || !currentUser.role) {
    return SchoolClass.find().sort({ name: 1 });
  }

  if (currentUser.role === 'ADMIN') {
    return SchoolClass.find().sort({ name: 1 });
  }

  if (currentUser.role === 'TEACHER') {
    return resolveClassesForTeacher(currentUser._id);
  }

  if (currentUser.role === 'STUDENT' && currentUser.schoolClass) {
    const schoolClass = await SchoolClass.findById(currentUser.schoolClass);
    return schoolClass ? [schoolClass] : [];
  }

  return [];
};

const serializeAttendance = (attendance) => ({
  _id: attendance._id,
  timetable: attendance.timetable,
  student: attendance.student,
  teacher: attendance.teacher,
  subject: attendance.subject,
  schoolClass: attendance.schoolClass || attendance.student?.schoolClass || null,
  date: attendance.date,
  present: attendance.present,
  notes: attendance.notes,
  createdAt: attendance.createdAt,
  updatedAt: attendance.updatedAt,
});

const listAttendances = async (req, res) => {
  try {
    const attendances = await loadAttendancesForUser(req.currentUser);
    const classOptions = await resolveClassOptions(req.currentUser);

    res.json({
      attendances: attendances.map(serializeAttendance),
      classOptions,
      currentUserRole: req.user.role,
    });
  } catch (error) {
    res.status(500).json({ message: `Error loading attendances: ${error.message}` });
  }
};

const createAttendance = async (req, res) => {
  try {
    const date = parseIsoDate(req.body.date);
    if (!date) {
      return res.status(400).json({ message: 'Date is required and must be valid' });
    }

    const attendance = await Attendance.create({
      timetable: req.body.timetable || null,
      student: req.body.student,
      teacher: req.body.teacher || req.user.id,
      subject: req.body.subject || null,
      schoolClass: req.body.schoolClass || null,
      date,
      present: Boolean(req.body.present),
      notes: req.body.notes || null,
    });

    const hydrated = await hydrateAttendance(Attendance.findById(attendance._id));
    res.status(201).json({
      message: 'Attendance created successfully.',
      attendance: serializeAttendance(hydrated),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateAttendanceStatus = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Unable to update attendance. It may have been removed or is no longer available.' });
    }

    const present = req.body.present !== undefined ? Boolean(req.body.present) : attendance.present;
    const notes = req.body.notes;

    attendance.present = present;
    attendance.notes = notes && String(notes).trim() !== '' ? String(notes).trim() : null;
    await attendance.save();

    const hydrated = await hydrateAttendance(Attendance.findById(attendance._id));
    res.json({ message: 'Attendance updated successfully.', attendance: serializeAttendance(hydrated) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const deleted = await Attendance.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Unable to delete attendance. It may have already been removed.' });
    }
    res.json({ message: 'Attendance deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const targetStudentId = req.user.role === 'STUDENT' ? req.user.id : req.params.studentId;
    const attendances = await hydrateAttendance(
      Attendance.find({ student: targetStudentId }).sort({ date: -1, _id: -1 })
    );
    res.json({ attendances: attendances.map(serializeAttendance) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchAttendances = async (req, res) => {
  try {
    const studentId = req.query.studentId;
    const baseAttendances = await loadAttendancesForUser(req.currentUser);

    if (!studentId) {
      return res.status(400).json({ message: 'Please enter a student ID to search.' });
    }

    const filtered = baseAttendances.filter((attendance) => String(attendance.student?._id) === String(studentId));
    if (filtered.length === 0) {
      return res.json({ attendances: [], info: 'No attendance records found for the provided student ID.' });
    }

    res.json({ attendances: filtered.map(serializeAttendance) });
  } catch (error) {
    res.status(500).json({ message: `Error searching attendances: ${error.message}` });
  }
};

const searchAttendancesByClass = async (req, res) => {
  try {
    const classId = req.query.classId;
    if (!classId) {
      return res.status(400).json({ message: 'Please select a class to search.' });
    }

    const classOptions = await resolveClassOptions(req.currentUser);
    const canAccess = classOptions.some((schoolClass) => String(schoolClass._id) === String(classId));
    if (!canAccess) {
      return res.status(403).json({ message: 'You do not have access to the selected class.' });
    }

    const selectedClass = await SchoolClass.findById(classId);
    if (!selectedClass) {
      return res.status(404).json({ message: 'The selected class could not be found.' });
    }

    const filtered = await getClassHistory(selectedClass._id);
    if (filtered.length === 0) {
      return res.json({ attendances: [], info: 'No attendance records found for the selected class.' });
    }

    res.json({ attendances: filtered.map(serializeAttendance) });
  } catch (error) {
    res.status(500).json({ message: `Error searching by class: ${error.message}` });
  }
};

const searchAttendancesByDate = async (req, res) => {
  try {
    const date = parseIsoDate(req.query.date);
    if (!date) {
      return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
    }

    const baseAttendances = await loadAttendancesForUser(req.currentUser);
    const targetDateOnly = toDateOnlyString(date);

    const filtered = baseAttendances.filter((attendance) => toDateOnlyString(attendance.date) === targetDateOnly);
    if (filtered.length === 0) {
      return res.json({ attendances: [], info: `No attendance records found for ${targetDateOnly}.` });
    }

    res.json({ attendances: filtered.map(serializeAttendance) });
  } catch (error) {
    res.status(500).json({ message: `Error searching by date: ${error.message}` });
  }
};

const selectClassForAttendance = async (req, res) => {
  try {
    const schoolClasses = await resolveClassesForTeacher(req.currentUser._id);
    const subjects = await Subject.find().sort({ name: 1 });

    res.json({
      schoolClasses,
      subjects,
      currentDate: new Date().toISOString().slice(0, 10),
      teacher: req.currentUser,
    });
  } catch (error) {
    res.status(500).json({ message: `Error loading classes for attendance: ${error.message}` });
  }
};

const markAttendanceForClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const subjectId = req.query.subjectId || null;
    const attendanceDate = parseIsoDate(req.query.date || new Date().toISOString().slice(0, 10));

    if (!attendanceDate) {
      return res.status(400).json({ message: 'Invalid date provided. Please use YYYY-MM-DD format.' });
    }

    const [schoolClass, subject] = await Promise.all([
      SchoolClass.findById(classId),
      subjectId ? Subject.findById(subjectId) : null,
    ]);

    if (!schoolClass) {
      return res.status(404).json({ message: 'The requested class could not be found.' });
    }

    const students = await User.find({ role: 'STUDENT', schoolClass: schoolClass._id })
      .select('name username email role schoolClass subjects')
      .sort({ name: 1 });

    const existingAttendances = await hydrateAttendance(
      Attendance.find({
        schoolClass: schoolClass._id,
        subject: subject ? subject._id : null,
        date: {
          $gte: new Date(toDateOnlyString(attendanceDate)),
          $lt: new Date(`${toDateOnlyString(attendanceDate)}T23:59:59.999Z`),
        },
      })
    );

    const existingAttendanceMap = {};
    const presentStudentIds = [];
    let sessionNotes = null;

    existingAttendances.forEach((attendance) => {
      const studentId = attendance.student?._id;
      if (!studentId) return;
      existingAttendanceMap[String(studentId)] = serializeAttendance(attendance);
      if (attendance.present) {
        presentStudentIds.push(String(studentId));
      }
      if (!sessionNotes && attendance.notes && attendance.notes.trim() !== '') {
        sessionNotes = attendance.notes;
      }
    });

    res.json({
      schoolClass,
      subject,
      teacher: req.currentUser,
      students,
      attendanceDate: toDateOnlyString(attendanceDate),
      existingAttendances: existingAttendances.map(serializeAttendance),
      existingAttendanceMap,
      presentStudentIds,
      sessionNotes,
    });
  } catch (error) {
    res.status(500).json({ message: `Error loading attendance form: ${error.message}` });
  }
};

const processBulkAttendance = async (req, res) => {
  try {
    const classId = req.params.classId;
    const subjectId = req.body.subjectId || null;
    const date = parseIsoDate(req.body.date);
    const notes = req.body.notes || null;
    const attendanceMap = req.body.attendance || {};

    if (!date) {
      return res.status(400).json({ message: 'Invalid date provided.' });
    }

    const [schoolClass, subject] = await Promise.all([
      SchoolClass.findById(classId),
      subjectId ? Subject.findById(subjectId) : null,
    ]);

    if (!schoolClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const dateOnly = toDateOnlyString(date);
    await Attendance.deleteMany({
      schoolClass: schoolClass._id,
      subject: subject ? subject._id : null,
      date: {
        $gte: new Date(dateOnly),
        $lt: new Date(`${dateOnly}T23:59:59.999Z`),
      },
    });

    const students = await User.find({ role: 'STUDENT', schoolClass: schoolClass._id }).select('_id');

    const rows = students.map((student) => ({
      student: student._id,
      teacher: req.currentUser._id,
      subject: subject ? subject._id : null,
      schoolClass: schoolClass._id,
      date: new Date(dateOnly),
      present: Boolean(attendanceMap[String(student._id)]),
      notes,
    }));

    if (rows.length > 0) {
      await Attendance.insertMany(rows);
    }

    const subjectName = subject ? ` for ${subject.name}` : '';
    res.json({
      message: `Attendance marked successfully for ${schoolClass.name}${subjectName} on ${dateOnly}`,
      count: rows.length,
    });
  } catch (error) {
    res.status(500).json({ message: `Error marking attendance: ${error.message}` });
  }
};

module.exports = {
  listAttendances,
  createAttendance,
  updateAttendanceStatus,
  deleteAttendance,
  getStudentAttendance,
  searchAttendances,
  searchAttendancesByClass,
  searchAttendancesByDate,
  selectClassForAttendance,
  markAttendanceForClass,
  processBulkAttendance,
};
