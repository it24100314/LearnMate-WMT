const User = require('../models/User');

const getUsers = async (req, res) => {
  try {
    const { q = '', role = '' } = req.query;
    const query = {};

    if (role && role !== 'ALL') {
      query.role = role;
    }

    if (q && String(q).trim()) {
      const regex = new RegExp(String(q).trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }, { username: regex }];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('schoolClass')
      .populate('subjects')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const isOwnProfile = String(req.params.id) === String(req.user?.id);

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ message: 'User role is not authorized' });
    }

    const user = await User.findById(req.params.id).select('-password').populate('schoolClass').populate('subjects');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const allowedRoles = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];
    const allowedFields = ['name', 'email', 'username', 'contact', 'role', 'active'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (updates.email && !/.+\@.+\..+/.test(String(updates.email))) {
      return res.status(400).json({ message: 'Email should be valid' });
    }

    if (updates.username && (String(updates.username).length < 3 || String(updates.username).length > 50)) {
      return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
    }

    if (updates.role && !allowedRoles.includes(updates.role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (updates.email) {
      const emailExists = await User.findOne({ email: updates.email, _id: { $ne: req.params.id } });
      if (emailExists) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }
    }

    if (updates.username) {
      const usernameExists = await User.findOne({ username: updates.username, _id: { $ne: req.params.id } });
      if (usernameExists) {
        return res.status(400).json({ message: 'This username is already taken.' });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .select('-password')
      .populate('schoolClass')
      .populate('subjects');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.email) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }
      if (error.keyPattern && error.keyPattern.username) {
        return res.status(400).json({ message: 'This username is already taken.' });
      }
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user?.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTeacherAssignments = async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id).populate('assignedClasses').populate('subjects');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (teacher.role !== 'TEACHER') {
      return res.status(403).json({ message: 'Only TEACHER role can access this endpoint' });
    }

    // Return all assigned classes and subjects for this teacher
    res.json({
      schoolClasses: teacher.assignedClasses || [],
      subjects: teacher.subjects || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, getUserById, updateUser, deleteUser, getTeacherAssignments };
