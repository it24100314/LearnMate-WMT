const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateUser, deleteUser, getMe, getTeacherAssignments } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(authorize('ADMIN', 'TEACHER'), getUsers);

// Get current authenticated user
router.route('/me')
  .get(getMe);

router.route('/me/assignments')
  .get(authorize('TEACHER'), getTeacherAssignments);

router.route('/:id')
  .get(getUserById)
  .put(authorize('ADMIN'), updateUser)
  .delete(authorize('ADMIN'), deleteUser);

module.exports = router;
