const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username must be at most 50 characters'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [/.+\@.+\..+/, 'Email should be valid']
  },
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  contact: {
    type: String
  },
  role: {
    type: String,
    enum: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'],
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  children: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    default: []
  },
  parents: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    default: []
  }
}, {
  timestamps: true
});

// Hash password before saving only if it has been modified
userSchema.pre('save', async function(next) {
  // Only hash if password has been added or modified, and is not already hashed (bcrypt hashes start with $2a, $2b, or $2x)
  if (!this.isModified('password')) {
    return next();
  }
  
  // Check if password is already hashed (bcrypt format starts with $2)
  if (this.password.startsWith('$2')) {
    return next();
  }
  
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);
