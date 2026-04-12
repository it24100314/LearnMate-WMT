const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  passMark: {
    type: Number,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 100
  },
  additionalInstructions: {
    type: String
  },
  filePath: {
    type: String
  }
}, {
  timestamps: true
});

examSchema.index({ schoolClass: 1, subject: 1, deadline: 1 });

module.exports = mongoose.model('Exam', examSchema);
