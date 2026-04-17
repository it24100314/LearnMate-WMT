const path = require('path');
const fs = require('fs');
const Exam = require('../models/Exam');
const AnswerSheet = require('../models/AnswerSheet');
const Mark = require('../models/Mark');
const Subject = require('../models/Subject');
const SchoolClass = require('../models/SchoolClass');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const { parseIsoDate } = require('../utils/timeUtils');

const EXAM_POPULATE = [
  { path: 'subject', select: 'name' },
  { path: 'teacher', select: 'name username email role' },
  { path: 'schoolClass', select: 'name' },
];

const ANSWER_SHEET_POPULATE = [
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

const hydrateExams = async (query) => {
  let chain = query;
  EXAM_POPULATE.forEach((entry) => {
    chain = chain.populate(entry);
  });
  return chain;
};

const hydrateAnswerSheets = async (query) => {
  let chain = query;
  ANSWER_SHEET_POPULATE.forEach((entry) => {
    chain = chain.populate(entry);
  });
  return chain;
};

const hydrateMarks = async (query) => {
  let chain = query;
  MARK_POPULATE.forEach((entry) => {
    chain = chain.populate(entry);
  });
  return chain;
};

const serializeExam = (exam) => ({
  _id: exam._id,
  subject: exam.subject,
  teacher: exam.teacher,
  schoolClass: exam.schoolClass,
  title: exam.title,
  deadline: exam.deadline,
  passMark: exam.passMark,
  maxMarks: exam.maxMarks,
  additionalInstructions: exam.additionalInstructions,
  filePath: exam.filePath,
  createdAt: exam.createdAt,
  updatedAt: exam.updatedAt,
});

const serializeAnswerSheet = (sheet) => ({
  _id: sheet._id,
  exam: sheet.exam,
  student: sheet.student,
  filePath: sheet.filePath,
  submittedAt: sheet.submittedAt,
  isLate: sheet.isLate,
  status: sheet.status,
  score: sheet.score,
  comments: sheet.comments,
  createdAt: sheet.createdAt,
  updatedAt: sheet.updatedAt,
});

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

const removeFileIfExists = (folderName, fileName) => {
  if (!fileName) return;
  const absolutePath = path.join(__dirname, '..', 'uploads', folderName, fileName);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const getExamOptions = async (_req, res) => {
  try {
    const [subjects, schoolClasses] = await Promise.all([
      Subject.find().select('_id name').sort({ name: 1 }),
      SchoolClass.find().select('_id name').sort({ name: 1 }),
    ]);

    res.json({ subjects, schoolClasses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listExams = async (req, res) => {
  try {
    let exams;

    if (req.user.role === 'TEACHER') {
      exams = await hydrateExams(Exam.find({ teacher: req.user.id }).sort({ deadline: -1 }));
    } else if (req.user.role === 'STUDENT') {
      if (!req.currentUser.schoolClass) {
        exams = [];
      } else {
        const subjectIds = (req.currentUser.subjects || []).map((subject) => String(subject._id || subject));
        const classExams = await hydrateExams(
          Exam.find({ schoolClass: req.currentUser.schoolClass._id || req.currentUser.schoolClass }).sort({ deadline: -1 })
        );
        exams = classExams.filter((exam) => subjectIds.includes(String(exam.subject?._id)));
      }
    } else {
      exams = await hydrateExams(Exam.find().sort({ deadline: -1 }));
    }

    const [subjects, schoolClasses] = await Promise.all([
      Subject.find().select('_id name').sort({ name: 1 }),
      SchoolClass.find().select('_id name').sort({ name: 1 }),
    ]);

    res.json({ exams: exams.map(serializeExam), subjects, schoolClasses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createExam = async (req, res) => {
  try {
    const subjectId = req.body.subjectId || req.body.subject;
    const schoolClassId = req.body.schoolClassId || req.body.schoolClass || req.body.classId;
    const deadline = parseIsoDate(req.body.deadline || req.body.date);
    const passMark = req.body.passMark !== undefined ? Number(req.body.passMark) : null;
    const maxMarks = req.body.maxMarks !== undefined ? Number(req.body.maxMarks) : null;
    const title = req.body.title && String(req.body.title).trim() !== '' ? String(req.body.title).trim() : null;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [subject, schoolClass] = await Promise.all([
      Subject.findById(subjectId),
      SchoolClass.findById(schoolClassId),
    ]);

    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    if (!schoolClass) {
      return res.status(400).json({ message: 'Class is required' });
    }

    if (!deadline) {
      return res.status(400).json({ message: 'Deadline is required' });
    }

    if (maxMarks === null || Number.isNaN(maxMarks)) {
      return res.status(400).json({ message: 'Max marks is required' });
    }

    if (passMark === null || Number.isNaN(passMark)) {
      return res.status(400).json({ message: 'Pass mark is required' });
    }

    const exam = await Exam.create({
      subject: subject._id,
      teacher: req.currentUser._id,
      schoolClass: schoolClass._id,
      title,
      deadline,
      passMark,
      maxMarks,
      additionalInstructions: req.body.additionalInstructions || null,
      filePath: req.file?.filename || null,
    });

    // Automatically trigger notification to all students in the class
    await notificationService.createNotificationForNewExam({
      ...exam.toObject(),
      schoolClass: { _id: schoolClass._id }
    });

    const hydrated = await hydrateExams(Exam.findById(exam._id));
    res.status(201).json({ message: 'Exam created successfully!', exam: serializeExam(hydrated) });
  } catch (error) {
    res.status(500).json({ message: `Failed to create exam: ${error.message}` });
  }
};

const updateExam = async (req, res) => {
  try {
    const exam = await hydrateExams(Exam.findById(req.params.id));
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (req.user.role === 'TEACHER' && String(exam.teacher?._id || exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit your own exams!' });
    }

    const subjectId = req.body.subjectId || req.body.subject || exam.subject?._id;
    const schoolClassId = req.body.schoolClassId || req.body.schoolClass || req.body.classId || exam.schoolClass?._id;
    const [subject, schoolClass] = await Promise.all([
      Subject.findById(subjectId),
      SchoolClass.findById(schoolClassId),
    ]);

    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    if (!schoolClass) {
      return res.status(400).json({ message: 'Class is required' });
    }

    if (req.body.deadline || req.body.date) {
      const deadline = parseIsoDate(req.body.deadline || req.body.date);
      if (!deadline) {
        return res.status(400).json({ message: 'Deadline is required' });
      }
      exam.deadline = deadline;
    }

    if (req.body.maxMarks !== undefined) {
      const maxMarks = Number(req.body.maxMarks);
      if (Number.isNaN(maxMarks)) {
        return res.status(400).json({ message: 'Max marks is required' });
      }
      exam.maxMarks = maxMarks;
    }

    if (req.body.passMark !== undefined) {
      const passMark = Number(req.body.passMark);
      if (Number.isNaN(passMark)) {
        return res.status(400).json({ message: 'Pass mark is required' });
      }
      exam.passMark = passMark;
    }

    exam.subject = subject._id;
    exam.schoolClass = schoolClass._id;
    exam.title = req.body.title !== undefined ? req.body.title : exam.title;
    exam.additionalInstructions = req.body.additionalInstructions !== undefined ? req.body.additionalInstructions : exam.additionalInstructions;

    if (req.file?.filename) {
      removeFileIfExists('exams', exam.filePath);
      exam.filePath = req.file.filename;
    }

    await exam.save();

    const hydrated = await hydrateExams(Exam.findById(exam._id));
    res.json({ message: 'Exam updated successfully!', exam: serializeExam(hydrated) });
  } catch (error) {
    res.status(500).json({ message: `Failed to update exam: ${error.message}` });
  }
};

const deleteExam = async (req, res) => {
  try {
    const exam = await hydrateExams(Exam.findById(req.params.id));
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (req.user.role === 'TEACHER' && String(exam.teacher?._id || exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete your own exams!' });
    }

    const answerSheets = await AnswerSheet.find({ exam: exam._id });
    answerSheets.forEach((sheet) => removeFileIfExists('answer-sheets', sheet.filePath));
    await AnswerSheet.deleteMany({ exam: exam._id });

    await Mark.deleteMany({ exam: exam._id });

    removeFileIfExists('exams', exam.filePath);
    await Exam.deleteOne({ _id: exam._id });

    res.json({ message: 'Exam deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchExams = async (req, res) => {
  try {
    let filter = {};
    if (req.query.subjectId) filter.subject = req.query.subjectId;
    if (req.query.classId) filter.schoolClass = req.query.classId;

    const exams = await hydrateExams(Exam.find(filter).sort({ deadline: -1 }));
    res.json({ exams: exams.map(serializeExam) });
  } catch (error) {
    res.status(500).json({ message: `Error searching exams: ${error.message}` });
  }
};

const downloadExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.filePath) {
      return res.status(404).json({ message: 'Exam file not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'exams', exam.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Exam file not found' });
    }

    const subjectName = exam.subject?.name || 'subject';
    res.download(filePath, `exam_${exam._id}_${subjectName}.pdf`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadAnswer = async (req, res) => {
  try {
    const exam = await hydrateExams(Exam.findById(req.params.id));
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please select a file to upload!' });
    }

    const student = req.currentUser;
    const subjectIds = (student.subjects || []).map((subject) => String(subject._id || subject));
    const enrolledInSubject = subjectIds.includes(String(exam.subject?._id));
    const sameClass = String(student.schoolClass?._id || student.schoolClass) === String(exam.schoolClass?._id || exam.schoolClass);

    if (!enrolledInSubject || !sameClass) {
      return res.status(403).json({ message: 'You are not authorized to upload answers for this exam!' });
    }

    const now = new Date();
    const deadline = new Date(exam.deadline);
    const isLate = now > deadline;

    let answerSheet = await AnswerSheet.findOne({ exam: exam._id, student: student._id });
    if (!answerSheet) {
      answerSheet = await AnswerSheet.create({
        exam: exam._id,
        student: student._id,
        filePath: req.file.filename,
        submittedAt: now,
        isLate,
        status: 'SUBMITTED',
      });
    } else {
      removeFileIfExists('answer-sheets', answerSheet.filePath);
      answerSheet.filePath = req.file.filename;
      answerSheet.submittedAt = now;
      answerSheet.isLate = isLate;
      answerSheet.status = 'SUBMITTED';
      await answerSheet.save();
    }

    const hydrated = await hydrateAnswerSheets(AnswerSheet.findById(answerSheet._id));
    res.json({ message: 'Answer sheet uploaded successfully!', answerSheet: serializeAnswerSheet(hydrated) });
  } catch (error) {
    res.status(500).json({ message: `Failed to upload answer sheet: ${error.message}` });
  }
};

const downloadAnswerSheet = async (req, res) => {
  try {
    const answerSheet = await hydrateAnswerSheets(AnswerSheet.findById(req.params.id));
    if (!answerSheet || !answerSheet.filePath) {
      return res.status(404).json({ message: 'Answer sheet file not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'answer-sheets', answerSheet.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Answer sheet file not found' });
    }

    res.download(filePath, `answer_${answerSheet._id}_${answerSheet.student?.name || 'student'}.pdf`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reviewAnswers = async (req, res) => {
  try {
    const exam = await hydrateExams(Exam.findById(req.params.id));
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (String(exam.teacher?._id || exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only review answers for your own exams!' });
    }

    const students = await User.find({
      role: 'STUDENT',
      schoolClass: exam.schoolClass?._id || exam.schoolClass,
      subjects: exam.subject?._id || exam.subject,
    }).select('name username email role schoolClass subjects');

    const [answerSheets, marks] = await Promise.all([
      hydrateAnswerSheets(AnswerSheet.find({ exam: exam._id })),
      hydrateMarks(Mark.find({ exam: exam._id })),
    ]);

    const answerSheetMap = {};
    answerSheets.forEach((sheet) => {
      if (sheet.student?._id) {
        answerSheetMap[String(sheet.student._id)] = serializeAnswerSheet(sheet);
      }
    });

    const markMap = {};
    marks.forEach((mark) => {
      if (mark.student?._id) {
        markMap[String(mark.student._id)] = serializeMark(mark);
      }
    });

    res.json({
      exam: serializeExam(exam),
      students,
      answerSheets: answerSheets.map(serializeAnswerSheet),
      existingMarks: marks.map(serializeMark),
      answerSheetMap,
      markMap,
    });
  } catch (error) {
    res.status(500).json({ message: `Error loading review page: ${error.message}` });
  }
};

const gradeAnswer = async (req, res) => {
  try {
    const answerSheet = await hydrateAnswerSheets(AnswerSheet.findById(req.params.answerSheetId));
    if (!answerSheet) {
      return res.status(404).json({ message: 'Answer sheet not found' });
    }

    if (String(answerSheet.exam?.teacher?._id || answerSheet.exam?.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only grade answers for your own exams!' });
    }

    const score = Number(req.body.score);
    if (Number.isNaN(score)) {
      return res.status(400).json({ message: 'Score is required' });
    }

    answerSheet.status = 'GRADED';
    answerSheet.comments = req.body.comments || null;
    await answerSheet.save();

    let mark = await Mark.findOne({ exam: answerSheet.exam._id, student: answerSheet.student._id });
    if (mark) {
      mark.score = score;
      mark.published = true;
      await mark.save();
    } else {
      mark = await Mark.create({
        exam: answerSheet.exam._id,
        student: answerSheet.student._id,
        score,
        published: true,
      });
    }

    const hydratedMark = await hydrateMarks(Mark.findById(mark._id));
    res.json({ message: 'Answer graded successfully!', mark: serializeMark(hydratedMark) });
  } catch (error) {
    res.status(500).json({ message: `Failed to grade answer: ${error.message}` });
  }
};

const gradeExam = async (req, res) => {
  try {
    const exam = await hydrateExams(Exam.findById(req.params.id));
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (String(exam.teacher?._id || exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only grade your own exams!' });
    }

    const students = await User.find({
      role: 'STUDENT',
      schoolClass: exam.schoolClass?._id || exam.schoolClass,
      subjects: exam.subject?._id || exam.subject,
    }).select('_id');

    const grades = req.body.grades || {};
    let gradedCount = 0;

    for (const student of students) {
      const row = grades[String(student._id)] || null;
      if (!row || row.score === undefined || row.score === null || row.score === '') {
        continue;
      }

      const score = Number(row.score);
      if (Number.isNaN(score) || score < 0 || score > Number(exam.maxMarks || 0)) {
        continue;
      }

      const comments = row.comments || null;

      const answerSheet = await AnswerSheet.findOne({ exam: exam._id, student: student._id });
      if (answerSheet) {
        answerSheet.status = 'GRADED';
        answerSheet.score = score;
        answerSheet.comments = comments;
        await answerSheet.save();
      }

      let mark = await Mark.findOne({ exam: exam._id, student: student._id });
      if (mark) {
        mark.score = score;
        mark.comments = comments;
        mark.published = true;
        await mark.save();
      } else {
        await Mark.create({
          exam: exam._id,
          student: student._id,
          score,
          comments,
          published: true,
        });
      }

      gradedCount += 1;
    }

    res.json({
      message: `Successfully graded ${gradedCount} students for ${exam.subject?.name || 'subject'} - ${exam.schoolClass?.name || 'class'}`,
      gradedCount,
    });
  } catch (error) {
    res.status(500).json({ message: `Failed to grade students: ${error.message}` });
  }
};

const editMark = async (req, res) => {
  try {
    const exam = await hydrateExams(Exam.findById(req.params.examId));
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (String(exam.teacher?._id || exam.teacher) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit marks for your own exams!' });
    }

    const studentId = req.body.studentId;
    const score = Number(req.body.score);
    const comments = req.body.comments || null;

    if (!studentId || Number.isNaN(score)) {
      return res.status(400).json({ message: 'studentId and score are required' });
    }

    let mark = await Mark.findOne({ exam: exam._id, student: studentId });
    let created = false;

    if (mark) {
      mark.score = score;
      mark.comments = comments;
      mark.published = true;
      await mark.save();
    } else {
      mark = await Mark.create({
        exam: exam._id,
        student: studentId,
        score,
        comments,
        published: true,
      });
      created = true;
    }

    const student = await User.findById(studentId).select('name');
    const hydrated = await hydrateMarks(Mark.findById(mark._id));
    res.json({
      message: created
        ? `Mark created successfully for ${student?.name || 'student'}`
        : `Mark updated successfully for ${student?.name || 'student'}`,
      mark: serializeMark(hydrated),
    });
  } catch (error) {
    res.status(500).json({ message: `Failed to update mark: ${error.message}` });
  }
};

const deleteAnswerSheet = async (req, res) => {
  try {
    const answerSheetId = req.params.id;
    const answerSheet = await AnswerSheet.findById(answerSheetId);

    if (!answerSheet) {
      return res.status(404).json({ message: 'Answer sheet not found' });
    }

    // Verify the current user is the student who submitted this answer sheet
    if (answerSheet.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own answer sheets' });
    }

    // Check if the exam deadline has passed
    const exam = await Exam.findById(answerSheet.exam);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const now = new Date();
    const deadline = new Date(exam.deadline);
    if (now > deadline) {
      return res.status(400).json({ message: 'Cannot delete answer sheet after deadline has passed' });
    }

    // Remove the file from storage
    if (answerSheet.filePath) {
      removeFileIfExists('answer-sheets', answerSheet.filePath);
    }

    // Delete from database
    await AnswerSheet.findByIdAndDelete(answerSheetId);

    res.json({ message: 'Answer sheet deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: `Failed to delete answer sheet: ${error.message}` });
  }
};

module.exports = {
  getExamOptions,
  listExams,
  createExam,
  updateExam,
  deleteExam,
  searchExams,
  downloadExam,
  uploadAnswer,
  downloadAnswerSheet,
  deleteAnswerSheet,
  reviewAnswers,
  gradeAnswer,
  gradeExam,
  editMark,
};
