const User = require('../models/User');
const Subject = require('../models/Subject');
const SchoolClass = require('../models/SchoolClass');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PASSWORD_POLICY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
const REGISTRATION_ROLES = ['STUDENT', 'TEACHER'];

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

const validatePasswordStrength = (password) => {
  if (!password || password.trim() === '') {
    throw new Error('Password is required and cannot be blank.');
  }
  if (!PASSWORD_POLICY_PATTERN.test(password)) {
    throw new Error('Password must be at least 8 characters long and include both uppercase and lowercase letters.');
  }
};

const normalizeIdList = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean).map(String);
  return [String(input)];
};

const getRegisterOptions = async (req, res) => {
  try {
    const [rawSchoolClasses, rawSubjects] = await Promise.all([
      SchoolClass.find().select('_id name').sort({ name: 1 }),
      Subject.find().select('_id name').sort({ name: 1 })
    ]);

    // Filter out duplicates by name
    const seenClasses = new Set();
    const schoolClasses = rawSchoolClasses.filter(c => {
      if (seenClasses.has(c.name)) return false;
      seenClasses.add(c.name);
      return true;
    });

    const seenSubjects = new Set();
    const subjects = rawSubjects.filter(s => {
      if (seenSubjects.has(s.name)) return false;
      seenSubjects.add(s.name);
      return true;
    });

    res.json({
      roles: REGISTRATION_ROLES,
      schoolClasses,
      subjects
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      name,
      role,
      schoolClassId,
      subjectIds,
      teacherSubjectIds,
      teacherClassIds
    } = req.body;

    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
    }
    if (!email || email.trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!/.+\@.+\..+/.test(email)) {
      return res.status(400).json({ message: 'Email should be valid' });
    }
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!role || !REGISTRATION_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const normalizedStudentSubjectIds = normalizeIdList(subjectIds);
    const normalizedTeacherSubjectIds = normalizeIdList(teacherSubjectIds);
    const normalizedTeacherClassIds = normalizeIdList(teacherClassIds);

    if (role === 'STUDENT' && normalizedStudentSubjectIds.length === 0) {
      return res.status(400).json({ message: 'Students must select at least one subject.' });
    }

    if (role === 'TEACHER' && normalizedTeacherSubjectIds.length === 0) {
      return res.status(400).json({ message: 'Teachers must select at least one subject to teach.' });
    }

    if (role === 'TEACHER' && normalizedTeacherClassIds.length === 0) {
      return res.status(400).json({ message: 'Teachers must select at least one grade/class to teach.' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'This username is already taken.' });
    }

    // Check password strength matching Java logic
    try {
      validatePasswordStrength(password);
    } catch (pwError) {
      return res.status(400).json({ message: pwError.message });
    }

    const userData = {
      username,
      email,
      password,
      name,
      role,
      // New self-registrations must be approved by admin before login.
      active: false
    };

    if (role === 'STUDENT' && schoolClassId) {
      const schoolClass = await SchoolClass.findById(schoolClassId);
      if (schoolClass) {
        userData.schoolClass = schoolClass._id;
      }
    }

    if (role === 'STUDENT') {
      const subjects = await Subject.find({ _id: { $in: normalizedStudentSubjectIds } }).select('_id');
      userData.subjects = subjects.map((subject) => subject._id);
    }

    if (role === 'TEACHER') {
      const subjects = await Subject.find({ _id: { $in: normalizedTeacherSubjectIds } }).select('_id');
      userData.subjects = subjects.map((subject) => subject._id);

      const classes = await SchoolClass.find({ _id: { $in: normalizedTeacherClassIds } }).select('_id');
      userData.assignedClasses = classes.map((schoolClass) => schoolClass._id);
    }

    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        message: 'Registration request sent successfully. Please wait for admin approval.',
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.email) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }
      if (error.keyPattern && error.keyPattern.username) {
        return res.status(400).json({ message: 'This username is already taken.' });
      }
    }
    res.status(500).json({ message: `Registration failed: ${error.message}` });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/Email and password are required.' });
    }

    // Accept both email and username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }

    if (!user.active) {
      return res.status(401).json({ message: 'User is disabled' });
    }

    const redirectMap = {
      ADMIN: '/dashboard/admin',
      TEACHER: '/dashboard/teacher',
      STUDENT: '/dashboard/student'
    };

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
        redirectUrl: redirectMap[user.role] || '/dashboard'
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { username, email, newPassword } = req.body;

    if ((!username || username.trim() === '') && (!email || email.trim() === '')) {
      return res.status(400).json({ message: 'Username or email is required.' });
    }

    try {
      validatePasswordStrength(newPassword);
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const query = username && username.trim() !== ''
      ? { username: username.trim() }
      : { email: email.trim().toLowerCase() };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: 'No user found with the provided details.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successful. Please log in with your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Password reset failed.' });
  }
};

module.exports = { getRegisterOptions, register, login, forgotPassword };
