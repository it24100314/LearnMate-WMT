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

const getTeacherAssignments = async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id).populate('schoolClass').populate('subjects');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (teacher.role !== 'TEACHER') {
      return res.status(403).json({ message: 'Only TEACHER role can access this endpoint' });
    }

    // Return classes and subjects assigned to this teacher
    res.json({
      schoolClasses: teacher.schoolClass ? [teacher.schoolClass] : [],
      subjects: teacher.subjects || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, getUserById, updateUser, deleteUser, getTeacherAssignments };
