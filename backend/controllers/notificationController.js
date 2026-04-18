const path = require('path');
const fs = require('fs');
const Notification = require('../models/Notification');
const Subject = require('../models/Subject');
const SchoolClass = require('../models/SchoolClass');
const notificationService = require('../services/notificationService');

const VALID_ROLES = ['ADMIN', 'TEACHER', 'STUDENT'];

const toRoleArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).toUpperCase());
  return [String(value).toUpperCase()];
};

const toIdArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return String(item._id || item.id || item);
        }
        return String(item);
      });
  }
  if (typeof value === 'object' && value !== null) {
    return [String(value._id || value.id || value)];
  }
  return [String(value)];
};

const canManageNotification = (currentUser, notification) => {
  if (!currentUser || !notification) return false;
  if (currentUser.role === 'ADMIN') return true;
  if (!notification.createdBy) return false;
  return String(notification.createdBy) === String(currentUser._id);
};

const serializeNotification = (notification) => ({
  _id: notification._id,
  title: notification.title,
  message: notification.message,
  createdAt: notification.createdAt,
  read: notification.read,
  readAt: notification.readAt,
  type: notification.type,
  targetUser: notification.targetUser,
  targetRole: notification.targetRole,
  targetClass: notification.targetClass,
  createdBy: notification.createdBy,
  broadcastKey: notification.broadcastKey,
  fileName: notification.fileName,
  originalFileName: notification.originalFileName,
  filePath: notification.filePath,
  fileType: notification.fileType,
  fileSize: notification.fileSize,
});

const listNotifications = async (req, res) => {
  try {
    const [receivedNotifications, sentNotifications, unreadNotificationCount] = await Promise.all([
      notificationService.getNotificationsForUser(req.currentUser),
      notificationService.getNotificationsCreatedBy(req.currentUser),
      notificationService.countUnreadNotifications(req.currentUser),
    ]);

    res.json({
      receivedNotifications: receivedNotifications.map(serializeNotification),
      sentNotifications: notificationService.buildSentNotificationViews(sentNotifications),
      currentUserId: req.currentUser._id,
      unreadNotificationCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotificationOptions = async (req, res) => {
  try {
    const prefillRoles = VALID_ROLES.filter((role) => role !== 'ADMIN');

    let teacherSubjects = [];
    let schoolClasses = [];

    if (req.currentUser.role === 'TEACHER') {
      const teacherSubjectIds = toIdArray(req.currentUser.subjects);
      const teacherClassIds = toIdArray(req.currentUser.assignedClasses);

      if (teacherSubjectIds.length > 0) {
        teacherSubjects = await Subject.find({ _id: { $in: teacherSubjectIds } }).select('_id name').sort({ name: 1 });
      }

      if (teacherClassIds.length > 0) {
        schoolClasses = await SchoolClass.find({ _id: { $in: teacherClassIds } }).select('_id name').sort({ name: 1 });
      }
    } else if (req.currentUser.role === 'ADMIN') {
      teacherSubjects = await Subject.find().select('_id name').sort({ name: 1 });
      schoolClasses = await SchoolClass.find().select('_id name').sort({ name: 1 });
    }

    res.json({
      roles: VALID_ROLES,
      prefillRoles,
      schoolClasses,
      teacherSubjects,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createNotification = async (req, res) => {
  try {
    const title = req.body.title ? String(req.body.title).trim() : '';
    const message = req.body.message ? String(req.body.message).trim() : '';
    const targetRoles = toRoleArray(req.body.targetRoles);
    const selectedClasses = toIdArray(req.body.selectedClasses);
    const selectedSubjects = toIdArray(req.body.selectedSubjects);

    const invalidRoles = targetRoles.filter((role) => !VALID_ROLES.includes(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ message: `Invalid roles selected: ${invalidRoles.join(', ')}` });
    }

    if (req.currentUser.role === 'TEACHER') {
      if (targetRoles.includes('ADMIN')) {
        return res.status(403).json({ message: 'Teachers cannot send notifications to admins.' });
      }

      const allowedClassIds = new Set(toIdArray(req.currentUser.assignedClasses));
      const allowedSubjectIds = new Set(toIdArray(req.currentUser.subjects));

      const hasUnassignedClass = selectedClasses.some((classId) => !allowedClassIds.has(classId));
      if (hasUnassignedClass) {
        return res.status(403).json({ message: 'You can only target classes assigned to you.' });
      }

      const hasUnassignedSubject = selectedSubjects.some((subjectId) => !allowedSubjectIds.has(subjectId));
      if (hasUnassignedSubject) {
        return res.status(403).json({ message: 'You can only target subjects assigned to you.' });
      }
    }

    if (!title || !message || targetRoles.length === 0) {
      let error = '';
      if (!title) error += 'Title is required. ';
      if (!message) error += 'Message is required. ';
      if (targetRoles.length === 0) error += 'Select at least one role. ';
      return res.status(400).json({ message: error.trim() });
    }

    if (targetRoles.includes('STUDENT') && selectedClasses.length === 0) {
      return res.status(400).json({ message: 'When targeting students, you must select at least one class.' });
    }

    if (targetRoles.includes('STUDENT') && selectedSubjects.length === 0) {
      return res.status(400).json({ message: 'When targeting students, you must select at least one subject.' });
    }

    const fileMeta = req.file
      ? {
          fileName: req.file.filename,
          originalFileName: req.file.originalname,
          filePath: req.file.filename,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        }
      : null;

    await notificationService.createManualNotificationWithClassesAndSubjects({
      author: req.currentUser,
      title,
      message,
      targetRoles,
      selectedClassIds: selectedClasses,
      selectedSubjectIds: selectedSubjects,
      fileMeta,
    });

    res.status(201).json({ message: 'Notification created successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const downloadNotificationFile = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('targetUser', '_id')
      .populate('createdBy', '_id');

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const targetUserId = notification.targetUser?._id ? String(notification.targetUser._id) : null;
    const creatorUserId = notification.createdBy?._id ? String(notification.createdBy._id) : null;
    const currentUserId = String(req.currentUser._id);

    if (targetUserId !== currentUserId && creatorUserId !== currentUserId && req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to access this file.' });
    }

    if (!notification.fileName) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'notifications', notification.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found.' });
    }

    res.download(filePath, notification.originalFileName || notification.fileName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    await notificationService.markNotificationAsRead(req.params.id, req.currentUser);
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.currentUser);
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (!canManageNotification(req.currentUser, notification)) {
      return res.status(403).json({ message: 'You can only edit notifications you created.' });
    }

    res.json({ notification: serializeNotification(notification) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (!canManageNotification(req.currentUser, notification)) {
      return res.status(403).json({ message: 'You can only edit notifications you created.' });
    }

    const title = req.body.title ? String(req.body.title).trim() : '';
    const message = req.body.message ? String(req.body.message).trim() : '';
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    await notificationService.updateNotification(req.params.id, title, message);
    res.json({ message: 'Notification updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (!canManageNotification(req.currentUser, notification)) {
      return res.status(403).json({ message: 'You can only delete notifications you created.' });
    }

    await notificationService.deleteNotification(req.params.id);
    res.json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get notifications visible to current user.
 * Visibility is recipient-scoped (targetUser === current user) for all roles.
 */
const getVisibleNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getVisibleNotificationsForUser(req.currentUser);
    const unreadCount = await notificationService.countUnreadNotifications(req.currentUser);
    
    res.json({
      notifications: notifications.map(serializeNotification),
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
