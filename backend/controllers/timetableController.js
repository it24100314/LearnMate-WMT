const Timetable = require('../models/Timetable');
const SchoolClass = require('../models/SchoolClass');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { isTimeOverlap } = require('../utils/timeUtils');
const notificationService = require('../services/notificationService');

const TIMETABLE_POPULATE = [
  { path: 'schoolClass', select: 'name' },
  { path: 'teacher', select: 'name username email role' },
  { path: 'subject', select: 'name' },
];

const normalizeWeekday = (day) => {
  if (!day) return null;
  return String(day).toUpperCase();
};

const validateTimetablePayload = async (payload, fallbackTeacherId) => {
  const schoolClassId = payload.schoolClass || payload.classId;
  const teacherId = payload.teacher || payload.teacherId || fallbackTeacherId;
  const subjectId = payload.subject || payload.subjectId || null;

  if (!schoolClassId) {
    throw new Error('Class is required');
  }

  if (!teacherId) {
    throw new Error('Teacher is required');
  }

  if (!payload.day) {
    throw new Error('Day is required');
  }

  if (!payload.startTime || !payload.endTime) {
    throw new Error('Start and end times are required');
  }

  const [schoolClass, teacher, subject] = await Promise.all([
    SchoolClass.findById(schoolClassId),
    User.findById(teacherId),
    subjectId ? Subject.findById(subjectId) : null,
  ]);

  if (!schoolClass) {
    throw new Error('Selected class not found.');
  }

  if (!teacher) {
    throw new Error('Teacher not found');
  }

  if (subjectId && !subject) {
    throw new Error('Subject not found');
  }

  return {
    schoolClass,
    teacher,
    subject,
    title: payload.title && payload.title.trim() !== '' ? payload.title.trim() : 'Lecture',
    description: payload.description && payload.description.trim() !== '' ? payload.description.trim() : 'Scheduled lecture',
    day: normalizeWeekday(payload.day),
    startTime: payload.startTime,
    endTime: payload.endTime,
    room: payload.room && payload.room.trim() !== '' ? payload.room.trim() : null,
    filePath: payload.filePath || null,
  };
};

const checkConflicts = async (timetableData, existingId = null) => {
  const baseFilter = {
    schoolClass: timetableData.schoolClass,
    day: timetableData.day,
  };

  if (existingId) {
    baseFilter._id = { $ne: existingId };
  }

  const sameClassEntries = await Timetable.find(baseFilter);

  for (const existing of sameClassEntries) {
    if (isTimeOverlap(timetableData.startTime, timetableData.endTime, existing.startTime, existing.endTime)) {
      throw new Error('Schedule conflict');
    }
  }

  if (timetableData.subject) {
    const subjectConflictFilter = {
      schoolClass: timetableData.schoolClass,
      day: timetableData.day,
      subject: timetableData.subject,
    };

    if (existingId) {
      subjectConflictFilter._id = { $ne: existingId };
    }

    const subjectConflicts = await Timetable.find(subjectConflictFilter).populate('subject schoolClass');
    if (subjectConflicts.length > 0) {
      throw new Error(
        `Subject '${timetableData.subject.name}' is already scheduled on ${timetableData.day} for class ${timetableData.schoolClass.name}. One subject can only be taught once per day for a class.`
      );
    }
  }
};

const serializeTimetable = (doc) => ({
  _id: doc._id,
  schoolClass: doc.schoolClass,
  teacher: doc.teacher,
  subject: doc.subject,
  title: doc.title,
  description: doc.description,
  day: doc.day,
  startTime: doc.startTime,
  endTime: doc.endTime,
  room: doc.room,
  filePath: doc.filePath,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const getTimetables = async (req, res) => {
  try {
    const day = req.query.day ? normalizeWeekday(req.query.day) : null;
    const classId = req.query.classId || null;

    let timetables = [];
    let info = null;

    if (req.user.role === 'STUDENT') {
      if (!req.currentUser.schoolClass) {
        return res.json({ timetables: [], error: 'No class assigned. Please contact your administrator.' });
      }

      const subjectIds = (req.currentUser.subjects || []).map((subject) => String(subject._id || subject));
      const baseQuery = {
        schoolClass: req.currentUser.schoolClass,
      };

      if (day) {
        baseQuery.day = day;
      }

      timetables = await Timetable.find(baseQuery)
        .populate(TIMETABLE_POPULATE)
        .sort({ day: 1, startTime: 1 });

      timetables = timetables.filter((entry) => !entry.subject || subjectIds.includes(String(entry.subject._id)));
    } else if (req.user.role === 'TEACHER') {
      if (!classId) {
        info = 'Please select a class to view its timetable.';
        return res.json({ timetables: [], info });
      }

      const classFilter = { schoolClass: classId };
      if (day) {
        classFilter.day = day;
      }

      timetables = await Timetable.find(classFilter)
        .populate(TIMETABLE_POPULATE)
        .sort({ day: 1, startTime: 1 });
    } else {
      const query = {};
      if (day) {
        query.day = day;
      }
      if (classId) {
        query.schoolClass = classId;
      }

      timetables = await Timetable.find(query)
        .populate(TIMETABLE_POPULATE)
        .sort({ day: 1, startTime: 1 });
    }

    res.json({
      timetables: timetables.map(serializeTimetable),
      info,
    });
  } catch (error) {
    res.status(500).json({ message: `Error loading timetable: ${error.message}` });
  }
};

const getTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id).populate(TIMETABLE_POPULATE);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json(serializeTimetable(timetable));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTimetable = async (req, res) => {
  try {
    const payload = await validateTimetablePayload(req.body, req.user.id);
    if (req.file?.filename) {
      payload.filePath = req.file.filename;
    }

    await checkConflicts(payload);

    const timetable = await Timetable.create({
      schoolClass: payload.schoolClass._id,
      teacher: payload.teacher._id,
      subject: payload.subject?._id || null,
      title: payload.title,
      description: payload.description,
      day: payload.day,
      startTime: payload.startTime,
      endTime: payload.endTime,
      room: payload.room,
      filePath: payload.filePath,
    });

    await notificationService.createNotificationForClass({
      schoolClass: payload.schoolClass,
      title: 'Timetable Updated',
      message: 'Timetable Update: The schedule for your class has been changed.',
      type: 'SYSTEM',
    });

    const hydrated = await Timetable.findById(timetable._id).populate(TIMETABLE_POPULATE);
    res.status(201).json({
      message: 'Lecture created successfully!',
      timetable: serializeTimetable(hydrated),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateTimetable = async (req, res) => {
  try {
    const existing = await Timetable.findById(req.params.id).populate(TIMETABLE_POPULATE);
    if (!existing) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    const resolvedPayload = await validateTimetablePayload(
      {
        ...existing.toObject(),
        ...req.body,
        classId: req.body.classId || req.body.schoolClass || existing.schoolClass?._id,
        subjectId: req.body.subjectId || req.body.subject || existing.subject?._id,
        teacherId: req.body.teacherId || req.body.teacher || existing.teacher?._id,
      },
      req.user.id
    );

    if (req.file?.filename) {
      resolvedPayload.filePath = req.file.filename;
    } else {
      resolvedPayload.filePath = existing.filePath;
    }

    await checkConflicts(resolvedPayload, existing._id);

    existing.schoolClass = resolvedPayload.schoolClass._id;
    existing.teacher = resolvedPayload.teacher._id;
    existing.subject = resolvedPayload.subject?._id || null;
    existing.title = resolvedPayload.title;
    existing.description = resolvedPayload.description;
    existing.day = resolvedPayload.day;
    existing.startTime = resolvedPayload.startTime;
    existing.endTime = resolvedPayload.endTime;
    existing.room = resolvedPayload.room;
    existing.filePath = resolvedPayload.filePath;

    await existing.save();

    const updated = await Timetable.findById(existing._id).populate(TIMETABLE_POPULATE);
    
    // Automatically trigger notification to all students in the class
    await notificationService.createNotificationForUpdatedTimetable({
      ...updated.toObject(),
      schoolClass: { _id: updated.schoolClass._id }
    });
    
    res.json({
      message: 'Lecture updated successfully!',
      timetable: serializeTimetable(updated),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteTimetable = async (req, res) => {
  try {
    const deletedTimetable = await Timetable.findByIdAndDelete(req.params.id);
    if (!deletedTimetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json({ message: 'Lecture deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: `Error deleting timetable: ${error.message}` });
  }
};

const searchTimetablesByDay = async (req, res) => {
  try {
    if (!req.query.day) {
      return res.status(400).json({ message: 'day is required' });
    }

    const day = normalizeWeekday(req.query.day);
    const timetables = await Timetable.find({ day })
      .populate(TIMETABLE_POPULATE)
      .sort({ startTime: 1 });

    res.json({ timetables: timetables.map(serializeTimetable) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTimetable,
  getTimetables,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  searchTimetablesByDay,
};
