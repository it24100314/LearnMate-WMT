const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  timetable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timetable'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: false
  },
  date: {
    type: Date,
    required: true
  },
  present: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE'],
    default: 'ABSENT'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

attendanceSchema.index({ schoolClass: 1, subject: 1, date: 1 });
attendanceSchema.index({ student: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
