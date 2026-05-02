const SchoolClass = require('../models/SchoolClass');
const Timetable = require('../models/Timetable');
const User = require('../models/User');

const getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await User.findById(teacherId).populate('assignedClasses');
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Requirement #1: Show only assigned classes
    const classes = teacher.assignedClasses || [];
    res.json(classes.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClassStudents = async (req, res) => {
  try {
    const classId = req.params.id;
    const students = await User.find({ schoolClass: classId, role: 'STUDENT' })
      .select('_id name username email role');
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createClass = async (req, res) => {
  try {
    const newClass = await SchoolClass.create(req.body);
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClasses = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    console.log(`[getClasses] User ID: ${userId}, Detected Role: ${role}`);

    let classes = [];
    if (!role || role === 'ADMIN') {
      console.log('[getClasses] Fetching all classes for ADMIN/Unknown.');
      classes = await SchoolClass.find().populate('students', 'name email role');
    } else if (role === 'TEACHER') {
      classes = req.currentUser?.assignedClasses || [];
      console.log(`[getClasses] Returning ${classes.length} assigned classes for teacher.`);
    }

    res.json(classes);
  } catch (error) {
    console.error('[getClasses] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const getClassById = async (req, res) => {
  try {
    const schoolClass = await SchoolClass.findById(req.params.id).populate('students', 'name email role');
    if (!schoolClass) return res.status(404).json({ message: 'Class not found' });
    res.json(schoolClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateClass = async (req, res) => {
  try {
    const updatedClass = await SchoolClass.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedClass) return res.status(404).json({ message: 'Class not found' });
    res.json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteClass = async (req, res) => {
  try {
    const deletedClass = await SchoolClass.findByIdAndDelete(req.params.id);
    if (!deletedClass) return res.status(404).json({ message: 'Class not found' });
    res.json({ message: 'Class removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createClass, getClasses, getClassById, updateClass, deleteClass, getTeacherClasses, getClassStudents };
