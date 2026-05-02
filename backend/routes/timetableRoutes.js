const express = require('express');
const router = express.Router();
const {
  createTimetable,
  getTimetables,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  searchTimetablesByDay,
  getMyTimetables,
} = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { buildUploader } = require('../middleware/uploadMiddleware');

const uploadTimetable = buildUploader('timetables').single('file');

router.use(protect);

router.route('/')
  .get(getTimetables)
  .post(authorize('ADMIN', 'TEACHER'), uploadTimetable, createTimetable);

router.get('/list', getTimetables);
router.get('/my', getMyTimetables);    // teacher's own sessions
router.get('/student/:studentId', getTimetables);

router.get('/search', searchTimetablesByDay);

router.route('/:id')
  .get(getTimetableById)
  .put(authorize('ADMIN', 'TEACHER'), uploadTimetable, updateTimetable)
  .delete(authorize('ADMIN', 'TEACHER'), deleteTimetable);

module.exports = router;
