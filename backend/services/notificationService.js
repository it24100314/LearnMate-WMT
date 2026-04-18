const crypto = require('crypto');
const Notification = require('../models/Notification');
const User = require('../models/User');

const toObjectIdStrings = (values) => {
  if (!Array.isArray(values)) return [];
  return values.filter(Boolean).map((value) => String(value));
};

const buildBaseNotification = ({ title, message, type = 'SYSTEM' }) => ({
  title,
  message,
  createdAt: new Date(),
  type,
  read: false,
  readAt: null,
});

const setFileInfo = (payload, fileMeta = {}) => {
  if (!fileMeta || !fileMeta.fileName) {
    return;
  }

  payload.fileName = fileMeta.fileName;
  payload.originalFileName = fileMeta.originalFileName || null;
  payload.filePath = fileMeta.filePath || null;
  payload.fileType = fileMeta.fileType || null;
  payload.fileSize = fileMeta.fileSize || null;
};

const createNotificationForUser = async ({
  recipient,
  schoolClass,
  title,
  message,
  type,
  roleTag,
  createdBy,
  broadcastKey,
  fileMeta,
}) => {
  if (!recipient) return null;

  const payload = {
    ...buildBaseNotification({ title, message, type }),
    targetUser: recipient._id,
    targetClass: schoolClass?._id || null,
    targetRole: roleTag || null,
    createdBy: createdBy?._id || null,
    broadcastKey: broadcastKey || null,
  };

  setFileInfo(payload, fileMeta);
  return Notification.create(payload);
};

const createNotificationForRole = async ({
  role,
  title,
  message,
  type = 'SYSTEM',
  createdBy = null,
  broadcastKey = null,
  fileMeta = null,
}) => {
  if (!role) {
    return [];
  }

  const recipients = await User.find({ role });
  const created = [];

  for (const recipient of recipients) {
    const targetClass = role === 'STUDENT' ? recipient.schoolClass : null;
    const notification = await createNotificationForUser({
      recipient,
      schoolClass: targetClass ? { _id: targetClass } : null,
      title,
      message,
      type,
      roleTag: role,
      createdBy,
      broadcastKey,
      fileMeta,
    });

    if (notification) {
      created.push(notification);
    }
  }

  return created;
};

const createNotificationForClass = async ({
  schoolClass,
  title,
  message,
  type = 'SYSTEM',
  createdBy = null,
  broadcastKey = null,
  fileMeta = null,
}) => {
  if (!schoolClass) return [];

  const recipients = await User.find({ role: 'STUDENT', schoolClass: schoolClass._id || schoolClass });
  const created = [];

  for (const recipient of recipients) {
    const notification = await createNotificationForUser({
      recipient,
      schoolClass,
      title,
      message,
      type,
      roleTag: 'STUDENT',
      createdBy,
      broadcastKey,
      fileMeta,
    });

    if (notification) {
      created.push(notification);
    }
  }

  return created;
};

const createNotificationForStudentsInClassesAndSubjects = async ({
  classIds,
  subjectIds,
  title,
  message,
  type = 'MANUAL',
  createdBy = null,
  broadcastKey,
  fileMeta = null,
}) => {
  const classIdStrings = toObjectIdStrings(classIds);
  const subjectIdStrings = toObjectIdStrings(subjectIds);

  if (classIdStrings.length === 0 || subjectIdStrings.length === 0) {
    return [];
  }

  const recipients = await User.find({
    role: 'STUDENT',
    schoolClass: { $in: classIdStrings },
    subjects: { $in: subjectIdStrings },
  }).populate('schoolClass');

  const created = [];
  for (const recipient of recipients) {
    const notification = await createNotificationForUser({
      recipient,
      schoolClass: recipient.schoolClass,
      title,
      message,
      type,
      roleTag: 'STUDENT',
      createdBy,
      broadcastKey,
      fileMeta,
    });

    if (notification) {
      created.push(notification);
    }
  }

  return created;
};

const createManualNotificationWithClassesAndSubjects = async ({
  author,
  title,
  message,
  targetRoles,
  selectedClassIds,
  selectedSubjectIds,
  fileMeta = null,
}) => {
  const roles = Array.isArray(targetRoles) ? [...new Set(targetRoles.filter(Boolean))] : [];
  const broadcastKey = crypto.randomUUID();
  let createdCount = 0;

  for (const role of roles) {
    if (role === 'STUDENT' && Array.isArray(selectedClassIds) && selectedClassIds.length > 0 && Array.isArray(selectedSubjectIds) && selectedSubjectIds.length > 0) {
      const created = await createNotificationForStudentsInClassesAndSubjects({
        classIds: selectedClassIds,
        subjectIds: selectedSubjectIds,
        title,
        message,
        type: 'MANUAL',
        createdBy: author,
        broadcastKey,
        fileMeta,
      });
      createdCount += created.length;
      continue;
    }

    const created = await createNotificationForRole({
      role,
      title,
      message,
      type: 'MANUAL',
      createdBy: author,
      broadcastKey,
      fileMeta,
    });
    createdCount += created.length;
  }

  if (createdCount === 0 && author) {
    const payload = {
      ...buildBaseNotification({ title, message, type: 'MANUAL' }),
      targetUser: author._id,
      createdBy: author._id,
      broadcastKey: crypto.randomUUID(),
    };
    setFileInfo(payload, fileMeta);
    await Notification.create(payload);
    createdCount = 1;
  }

  return createdCount;
};

const getNotificationsForUser = async (user) => {
  if (!user) return [];
  return Notification.find({ targetUser: user._id })
    .sort({ createdAt: -1 })
    .populate('targetClass', 'name')
    .populate('createdBy', 'name role');
};

const getNotificationsCreatedBy = async (user) => {
  if (!user) return [];
  return Notification.find({ createdBy: user._id })
    .sort({ createdAt: -1 })
    .populate('targetClass', 'name')
    .populate('targetUser', 'name role')
    .populate('createdBy', 'name role');
};

const buildSentNotificationViews = (notifications) => {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  const grouped = new Map();

  notifications.forEach((notification) => {
    if (!notification) return;

    const key = notification.broadcastKey && notification.broadcastKey.trim() !== ''
      ? notification.broadcastKey
      : `SINGLE-${notification._id}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        notification,
        roles: new Set(),
        classes: new Set(),
      });
    }

    const current = grouped.get(key);
    if (notification.targetRole) {
      current.roles.add(notification.targetRole);
    }
    if (notification.targetClass?.name) {
      current.classes.add(notification.targetClass.name);
    }
  });

  return [...grouped.values()]
    .sort((a, b) => new Date(b.notification.createdAt) - new Date(a.notification.createdAt))
    .map((entry) => ({
      notification: entry.notification,
      roles: [...entry.roles],
      classes: [...entry.classes],
    }));
};

const markNotificationAsRead = async (notificationId, user) => {
  if (!notificationId || !user) return false;

  const notification = await Notification.findById(notificationId);
  if (!notification) return false;
  if (!notification.targetUser || String(notification.targetUser) !== String(user._id)) return false;

  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return true;
};

const markAllAsRead = async (user) => {
  if (!user) return 0;

  const result = await Notification.updateMany(
    { targetUser: user._id, read: false },
    { $set: { read: true, readAt: new Date() } }
  );

  return result.modifiedCount || 0;
};

const countUnreadNotifications = async (user) => {
  if (!user) return 0;
  return Notification.countDocuments({ targetUser: user._id, read: false });
};

const updateNotification = async (id, title, message) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    return null;
  }

  if (notification.broadcastKey && notification.broadcastKey.trim() !== '') {
    await Notification.updateMany(
      { broadcastKey: notification.broadcastKey },
      { $set: { title, message } }
    );
    return Notification.findById(id);
  }

  notification.title = title;
  notification.message = message;
  await notification.save();
  return notification;
};

const deleteNotification = async (id) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    return false;
  }

  if (notification.broadcastKey && notification.broadcastKey.trim() !== '') {
    await Notification.deleteMany({ broadcastKey: notification.broadcastKey });
    return true;
  }

  await Notification.deleteOne({ _id: id });
  return true;
};

// ============== AUTO-TRIGGER NOTIFICATIONS ==============

/**
 * Trigger notification when new exam is created
 * Sends to all STUDENTS in the exam's class
 */
const createNotificationForNewExam = async (exam) => {
  if (!exam || !exam.schoolClass) {
    return [];
  }

  const schoolClass = exam.schoolClass._id ? exam.schoolClass : { _id: exam.schoolClass };
  const title = 'New Exam Posted';
  const message = `New exam "${exam.name}" scheduled. Check your timetable for details.`;

  return createNotificationForClass({
    schoolClass,
    title,
    message,
    type: 'SYSTEM',
  });
};

/**
 * Trigger notification when timetable is updated
 * Sends to all STUDENTS in the timetable's class
 */
const createNotificationForUpdatedTimetable = async (timetable) => {
  if (!timetable || !timetable.schoolClass) {
    return [];
  }

  const schoolClass = timetable.schoolClass._id ? timetable.schoolClass : { _id: timetable.schoolClass };
  const title = 'Timetable Updated';
  const message = `Your class timetable has been updated. Please check the new schedule.`;

  return createNotificationForClass({
    schoolClass,
    title,
    message,
    type: 'SYSTEM',
  });
};

/**
 * Trigger notification when marks are released for a student
 * Sends to the STUDENT
 */
const createNotificationForMarksReleased = async (student, marksInfo = {}) => {
  if (!student || !student._id) {
    return [];
  }

  const title = 'Marks Released';
  const subject = marksInfo.subject ? marksInfo.subject.name : 'Subject';
  const message = `Your marks for ${subject} have been released.`;

  const created = [];

  // Create notification for student
  const studentNotif = await createNotificationForUser({
    recipient: student,
    schoolClass: student.schoolClass ? { _id: student.schoolClass } : null,
    title,
    message,
    type: 'SYSTEM',
    roleTag: 'STUDENT',
  });
  if (studentNotif) {
    created.push(studentNotif);
  }

  return created;
};

/**
 * Create notification for students in specific classes
 * Used for manual notifications targeting specific grades
 */
const createNotificationForStudentsInClasses = async ({
  classIds,
  title,
  message,
  type = 'MANUAL',
  createdBy = null,
  broadcastKey = null,
  fileMeta = null,
}) => {
  if (!classIds || classIds.length === 0) {
    return [];
  }

  const classIdStrings = toObjectIdStrings(classIds);
  const recipients = await User.find({
    role: 'STUDENT',
    schoolClass: { $in: classIdStrings },
  }).populate('schoolClass');

  const created = [];
  for (const recipient of recipients) {
    const notification = await createNotificationForUser({
      recipient,
      schoolClass: recipient.schoolClass,
      title,
      message,
      type,
      roleTag: 'STUDENT',
      createdBy,
      broadcastKey,
      fileMeta,
    });
    if (notification) {
      created.push(notification);
    }
  }

  return created;
};

/**
 * Retrieve notifications visible to a specific user
 * Visibility is recipient-scoped (targetUser == current user)
 */
const getVisibleNotificationsForUser = async (user) => {
  if (!user || !user._id) {
    return [];
  }

  return Notification.find({ targetUser: user._id })
    .sort({ createdAt: -1 })
    .populate('targetClass', 'name')
    .populate('targetUser', 'name role')
    .populate('createdBy', 'name role');
};

module.exports = {
  createNotificationForRole,
  createNotificationForClass,
  createManualNotificationWithClassesAndSubjects,
  getNotificationsForUser,
  getNotificationsCreatedBy,
  buildSentNotificationViews,
  markNotificationAsRead,
  markAllAsRead,
  countUnreadNotifications,
  updateNotification,
  deleteNotification,
  createNotificationForNewExam,
  createNotificationForUpdatedTimetable,
  createNotificationForMarksReleased,
  createNotificationForStudentsInClasses,
  getVisibleNotificationsForUser,
};
