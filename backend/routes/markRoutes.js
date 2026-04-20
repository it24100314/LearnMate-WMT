const express = require('express');
const router = express.Router();
const {
  listMarks,
  createMark,
  updateMark,
  deleteMark,
  getStudentMarks,
  getMarksByExam,
  searchMarks,
  searchMarksBySubject,
  processBulkMarks,
} = require('../controllers/markController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', listMarks);

router.post('/create', authorize('TEACHER'), createMark);
router.post('/bulk', authorize('TEACHER'), processBulkMarks);

router.put('/edit/:id', authorize('TEACHER'), updateMark);

router.delete('/delete/:id', authorize('TEACHER', 'ADMIN'), deleteMark);

router.get('/search', searchMarks);

router.get('/search-by-subject', authorize('STUDENT'), searchMarksBySubject);
router.get('/exam/:examId', authorize('ADMIN', 'TEACHER'), getMarksByExam);

router.route('/student/:studentId')
  .get(getStudentMarks);

module.exports = router;
