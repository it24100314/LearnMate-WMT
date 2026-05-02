const Subject = require('../models/Subject');

const listSubjects = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    console.log(`[listSubjects] User ID: ${userId}, Detected Role: ${role}`);

    let subjects = [];
    if (!role || role === 'ADMIN') {
      console.log('[listSubjects] Fetching all subjects for ADMIN/Unknown.');
      subjects = await Subject.find().sort({ name: 1 });
    } else if (role === 'TEACHER') {
      subjects = req.currentUser?.subjects || [];
      subjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      console.log(`[listSubjects] Returning ${subjects.length} assigned subjects for teacher.`);
    }

    res.json({ subjects });
  } catch (error) {
    console.error('[listSubjects] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const createSubject = async (req, res) => {
  try {
    const name = req.body.name ? String(req.body.name).trim() : '';
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    const subject = await Subject.create({ name });
    res.status(201).json({ subject });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const name = req.body.name ? String(req.body.name).trim() : '';
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    subject.name = name;
    await subject.save();
    res.json({ subject });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
