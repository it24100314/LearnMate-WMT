const User = require('../models/User');

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('schoolClass').populate('subjects');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('schoolClass').populate('subjects');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    // req.currentUser is already populated by auth middleware
    if (!req.currentUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      _id: req.currentUser._id,
      username: req.currentUser.username,
      name: req.currentUser.name,
      email: req.currentUser.email,
      role: req.currentUser.role,
      active: req.currentUser.active,
      schoolClass: req.currentUser.schoolClass,
      subjects: req.currentUser.subjects,
      children: req.currentUser.children,
      parents: req.currentUser.parents,
      assignedClasses: req.currentUser.assignedClasses
    });
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

module.exports = { getUsers, getUserById, updateUser, deleteUser, getMe, getTeacherAssignments };
