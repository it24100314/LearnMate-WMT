const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

const MARK_POPULATE = [
  {
    path: 'exam',
    populate: [
      { path: 'subject', select: 'name' },
      { path: 'schoolClass', select: 'name' },
      { path: 'teacher', select: 'name username email role' },
    ],
  },
  { path: 'student', select: 'name username email role schoolClass subjects' },
];

const hydrateMarks = async (query) => {
  let chain = query;
  MARK_POPULATE.forEach((entry) => {
    chain = chain.populate(entry);
  });
  return chain;
};

const serializeMark = (mark) => ({
  _id: mark._id,
  exam: mark.exam,
  student: mark.student,
  score: mark.score,
  published: mark.published,
  comments: mark.comments,
  createdAt: mark.createdAt,
  updatedAt: mark.updatedAt,
});

const listMarks = async (req, res) => {
  try {
    let marks;

    if (req.user.role === 'TEACHER') {
      const teacherExams = await Exam.find({ teacher: req.user.id }).select('_id');
      const examIds = teacherExams.map((exam) => exam._id);
      marks = await hydrateMarks(Mark.find({ exam: { $in: examIds } }));
    } else if (req.user.role === 'STUDENT') {
      marks = await hydrateMarks(Mark.find({ student: req.user.id }));
    } else {
      marks = await hydrateMarks(Mark.find());
    }

    res.json({ marks: marks.map(serializeMark) });
  } catch (error) {
    res.status(500).json({ message: `Error loading marks: ${error.message}` });
  }
};

const createMark = async (req, res) => {
  try {
    const examId = req.body.exam || req.body.examId;
    const studentId = req.body.student || req.body.studentId;

    if (!examId) {
      return res.status(400).json({ message: 'Please select an exam' });
    }

    if (!studentId) {
      return res.status(400).json({ message: 'Please select a student' });
    }

    const [exam, student] = await Promise.all([
      Exam.findById(examId).populate('teacher'),
      User.findById(studentId),
    ]);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (req.user.role === 'TEACHER' && String(exam.teacher?._id || exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only create marks for your own exams!' });
    }

    const score = Number(req.body.score);
    if (Number.isNaN(score)) {
      return res.status(400).json({ message: 'Score is required' });
    }

    let mark = await Mark.findOne({ exam: exam._id, student: student._id });
    if (mark) {
      mark.score = score;
      mark.published = req.body.published !== undefined ? Boolean(req.body.published) : mark.published;
      mark.comments = req.body.comments || null;
      await mark.save();
    } else {
      mark = await Mark.create({
        exam: exam._id,
        student: student._id,
        score,
        published: Boolean(req.body.published),
        comments: req.body.comments || null,
      });
    }

    const hydrated = await hydrateMarks(Mark.findById(mark._id));
    res.status(201).json({ message: 'Mark saved successfully.', mark: serializeMark(hydrated) });
  } catch (error) {
    res.status(400).json({ message: `Failed to save mark: ${error.message}` });
  }
};

const updateMark = async (req, res) => {
  try {
    const mark = await Mark.findById(req.params.id).populate({ path: 'exam', populate: { path: 'teacher' } });
    if (!mark) {
      return res.status(404).json({ message: 'Mark not found' });
    }

    if (req.user.role === 'TEACHER' && String(mark.exam.teacher?._id || mark.exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit marks for your own exams!' });
    }

    if (req.body.score !== undefined) {
      const score = Number(req.body.score);
      if (Number.isNaN(score)) {
        return res.status(400).json({ message: 'Score must be a number' });
      }
      mark.score = score;
    }

    if (req.body.comments !== undefined) {
      mark.comments = req.body.comments;
    }

    if (req.body.published !== undefined) {
      mark.published = Boolean(req.body.published);
    }

    await mark.save();

    // Trigger notification if marks are being published/released
    if (mark.published && req.body.published === true) {
      const student = await User.findById(mark.student).populate('subjects');
      const exam = await Exam.findById(mark.exam).populate('subject');
      if (student && exam) {
        await notificationService.createNotificationForMarksReleased(student, {
          subject: exam.subject,
        });
      }
    }

    const hydrated = await hydrateMarks(Mark.findById(mark._id));
    res.json({ message: 'Mark updated successfully.', mark: serializeMark(hydrated) });
  } catch (error) {
    res.status(400).json({ message: `Failed to update mark: ${error.message}` });
  }
};

const deleteMark = async (req, res) => {
  try {
    const mark = await Mark.findById(req.params.id).populate({ path: 'exam', populate: { path: 'teacher' } });
    if (!mark) {
      return res.status(404).json({ message: 'Mark not found' });
    }

    if (req.user.role === 'TEACHER' && String(mark.exam.teacher?._id || mark.exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete marks for your own exams!' });
    }

    await Mark.deleteOne({ _id: mark._id });
    res.json({ message: 'Mark deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentMarks = async (req, res) => {
  try {
    const targetStudentId = req.user.role === 'STUDENT' ? req.user.id : req.params.studentId;
    const marks = await hydrateMarks(
      Mark.find({ student: targetStudentId })
    );
    res.json({ marks: marks.map(serializeMark) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchMarks = async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Please enter a student ID to search.' });
    }

    const marks = await hydrateMarks(Mark.find({ student: studentId }));
    res.json({ marks: marks.map(serializeMark) });
  } catch (error) {
    res.status(500).json({ message: `Error searching marks: ${error.message}` });
  }
};

const searchMarksBySubject = async (req, res) => {
  try {
    const subjectId = req.query.subjectId;
    if (!subjectId) {
      return res.status(400).json({ message: 'Please select a subject to search.' });
    }

    const marks = await hydrateMarks(
      Mark.find({ student: req.user.id }).populate({
        path: 'exam',
        populate: [{ path: 'subject', select: 'name' }, { path: 'schoolClass', select: 'name' }, { path: 'teacher', select: 'name username email role' }],
      })
    );

    const filtered = marks.filter((mark) => String(mark.exam?.subject?._id) === String(subjectId));
    res.json({ marks: filtered.map(serializeMark) });
  } catch (error) {
    res.status(500).json({ message: `Error searching marks by subject: ${error.message}` });
  }
};

const processBulkMarks = async (req, res) => {
  try {
    const { examId, marksData } = req.body;
    // marksData should be an object representing studentId: { score: number, comments: string, published: boolean }

    if (!examId) {
      return res.status(400).json({ message: 'Exam ID is required.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    if (req.user.role === 'TEACHER' && String(exam.teacher?._id || exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only enter marks for your own exams!' });
    }

    for (const studentId of Object.keys(marksData)) {
      const data = marksData[studentId];
      if (data.score === undefined || data.score === null || data.score === '') continue;

      let score = Number(data.score);
      if (Number.isNaN(score)) continue;
      
      // Limit check (replicating java validation loosely)
      if (exam.maxMarks && score > exam.maxMarks) {
        score = exam.maxMarks;
      }

      let mark = await Mark.findOne({ exam: examId, student: studentId });
      if (mark) {
        mark.score = score;
        if (data.comments !== undefined) mark.comments = data.comments;
        if (data.published !== undefined) mark.published = Boolean(data.published);
        await mark.save();
      } else {
        await Mark.create({
          exam: exam._id,
          student: studentId,
          score,
          comments: data.comments || null,
          published: Boolean(data.published)
        });
      }
    }

    res.json({ message: 'Marks successfully saved.' });
  } catch (error) {
    res.status(500).json({ message: `Error processing bulk marks: ${error.message}` });
  }
};

module.exports = {
  listMarks,
  createMark,
  updateMark,
  deleteMark,
  getStudentMarks,
  searchMarks,
  searchMarksBySubject,
  processBulkMarks,
};
