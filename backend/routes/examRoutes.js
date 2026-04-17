const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/examController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { buildUploader } = require('../middleware/uploadMiddleware');

const examUpload = buildUploader('exams').single('file');
const answerUpload = buildUploader('answer-sheets').single('file');

router.use(protect);

router.get('/options', authorize('TEACHER', 'ADMIN'), getExamOptions);
router.get('/list', listExams);
router.get('/search', searchExams);
router.get('/download/:id', downloadExam);
router.get('/download-answer/:id', downloadAnswerSheet);

router.post('/create', authorize('TEACHER'), examUpload, createExam);
router.put('/edit/:id', authorize('TEACHER'), examUpload, updateExam);
router.delete('/delete/:id', authorize('TEACHER', 'ADMIN'), deleteExam);

router.post('/upload-answer/:id', authorize('STUDENT'), answerUpload, uploadAnswer);
router.delete('/delete-answer/:id', authorize('STUDENT'), deleteAnswerSheet);
router.get('/review-answers/:id', authorize('TEACHER'), reviewAnswers);
router.post('/grade-answer/:answerSheetId', authorize('TEACHER'), gradeAnswer);
router.post('/grade-exam/:id', authorize('TEACHER'), gradeExam);
router.post('/edit-mark/:examId', authorize('TEACHER'), editMark);

module.exports = router;
