const mongoose = require('mongoose');

const answerSheetSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['SUBMITTED', 'REVIEWED', 'GRADED'],
    default: 'SUBMITTED'
  },
  score: {
    type: Number
  },
  comments: {
    type: String
  }
}, {
  timestamps: true
});

answerSheetSchema.index({ exam: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('AnswerSheet', answerSheetSchema);
