const express = require('express');
const router = express.Router();
const {
  listNotifications,
  getNotificationOptions,
  createNotification,
  downloadNotificationFile,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationById,
  updateNotification,
  deleteNotification,
  getVisibleNotifications,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { buildUploader } = require('../middleware/uploadMiddleware');

const notificationUpload = buildUploader('notifications').single('file');

router.use(protect);

router.get('/list', listNotifications);
router.get('/visible', getVisibleNotifications);
router.get('/options', authorize('TEACHER', 'ADMIN'), getNotificationOptions);
router.get('/download/:id', downloadNotificationFile);
router.get('/edit/:id', authorize('TEACHER', 'ADMIN'), getNotificationById);

router.post('/create', authorize('TEACHER', 'ADMIN'), notificationUpload, createNotification);
router.post('/mark-read/:id', markNotificationAsRead);
router.post('/mark-all-read', markAllNotificationsAsRead);

router.put('/edit/:id', authorize('TEACHER', 'ADMIN'), updateNotification);
router.delete('/delete/:id', authorize('TEACHER', 'ADMIN'), deleteNotification);

module.exports = router;
