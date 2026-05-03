const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
dotenv.config();

// Load models
const User = require('./models/User');
const SchoolClass = require('./models/SchoolClass');
const Subject = require('./models/Subject');
const Exam = require('./models/Exam');
const Timetable = require('./models/Timetable');
const Mark = require('./models/Mark');
const Fee = require('./models/Fee');
const Notification = require('./models/Notification');

// Connect to DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/learnmate')
  .then(() => console.log('MongoDB Connected for Seeding'))
  .catch(err => {
    console.error('Connection error', err);
    process.exit(1);
  });

const seedDatabase = async () => {
  try {
    // Clear existing data to ensure a clean database
    await Fee.deleteMany({});
    await Notification.deleteMany({});
    await Mark.deleteMany({});
    await Timetable.deleteMany({});
    await Exam.deleteMany({});
    await Subject.deleteMany({});
    await SchoolClass.deleteMany({});
    await User.deleteMany({});
    console.log('✓ Existing data cleared');

    // 1. Create Subjects
    const subjects = await Subject.insertMany([
      { name: 'Science' },
      { name: 'Mathematics' },
      { name: 'ICT' },
      { name: 'History' },
      { name: 'Spanish' },
      { name: 'English' }
    ]);
    console.log(`✓ ${subjects.length} Subjects created`);

    // 2. Create School Classes (Grade 6 to 11)
    const classes = await SchoolClass.insertMany([
      { name: 'Grade 6', description: 'Middle School' },
      { name: 'Grade 7', description: 'Middle School' },
      { name: 'Grade 8', description: 'Middle School' },
      { name: 'Grade 9', description: 'High School' },
      { name: 'Grade 10', description: 'High School' },
      { name: 'Grade 11', description: 'High School' }
    ]);
    console.log(`✓ ${classes.length} School Classes created`);

    // 3. Create 3 Core Users (ADMIN, TEACHER, STUDENT)
    // NOTE: Passwords are PLAIN TEXT here. The User.js pre('save') hook will hash them.
    const admin = await User.create({
      username: 'admin@',
      email: 'admin@learnmate.com',
      password: 'Admin@123',
      name: 'System Administrator',
      role: 'ADMIN',
      active: true
    });
    console.log('✓ ADMIN user created: admin@');

    const teacher = await User.create({
      username: 'teacher@',
      email: 'teacher@learnmate.com',
      password: 'Teacher@123',
      name: 'John Smith',
      role: 'TEACHER',
      active: true,
      subjects: [subjects[0]._id, subjects[1]._id], // Science, Mathematics
      assignedClasses: [classes[4]._id, classes[5]._id] // Grade 10, Grade 11
    });
    console.log('✓ TEACHER user created: teacher@ (assigned to Grade 10 & 11)');

    const student = await User.create({
      username: 'student@',
      email: 'student@learnmate.com',
      password: 'Student@123',
      name: 'Alice Johnson',
      role: 'STUDENT',
      active: true,
      schoolClass: classes[4]._id, // Grade 10
      subjects: [subjects[0]._id, subjects[1]._id] // Science, Mathematics
    });
    console.log('✓ STUDENT user created: student@');

    console.log('✓ Core users created\n');

    // 4. Create sample Timetable entries
    const timetableExamples = await Timetable.insertMany([
      {
        schoolClass: classes[4]._id,
        day: 'MONDAY',
        title: 'Science Class',
        subject: subjects[0]._id,
        startTime: '08:30',
        endTime: '10:30',
        teacher: teacher._id,
        room: 'Lab-A'
      },
      {
        schoolClass: classes[4]._id,
        day: 'TUESDAY',
        title: 'Mathematics Class',
        subject: subjects[1]._id,
        startTime: '10:45',
        endTime: '12:45',
        teacher: teacher._id,
        room: 'Room-101'
      },
      {
        schoolClass: classes[4]._id,
        day: 'WEDNESDAY',
        title: 'Science Class',
        subject: subjects[0]._id,
        startTime: '13:30',
        endTime: '15:30',
        teacher: teacher._id,
        room: 'Lab-A'
      }
    ]);
    console.log(`✓ ${timetableExamples.length} Timetable entries created`);

    // 4.5 Setup uploads directories and dummy files
    const uploadsDir = path.join(__dirname, 'uploads');
    const dirsToCreate = ['exams', 'answer-sheets', 'submissions'];
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    for (const dir of dirsToCreate) {
      const dirPath = path.join(uploadsDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const dummyFilePath = path.join(dirPath, 'dummy.txt');
      if (!fs.existsSync(dummyFilePath)) {
        fs.writeFileSync(dummyFilePath, 'This is a valid dummy file for testing.');
      }
    }
    console.log('✓ Uploads directories and dummy files verified');

    // 5. Create sample Exams
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const exam = await Exam.create({
      title: 'Science Mid-Term Exam',
      subject: subjects[0]._id,
      teacher: teacher._id,
      schoolClass: classes[4]._id,
      deadline: futureDate,
      passMark: 40,
      maxMarks: 100,
      filePath: 'dummy.txt'
    });
    console.log('✓ Sample Exam created');

    // 6. Create sample Fees
    const fee = await Fee.create({
      student: student._id,
      subject: subjects[0]._id,
      schoolClass: classes[4]._id,
      amount: 50.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'PENDING'
    });
    console.log('✓ Sample Fee created');

    console.log('\n' + '='.repeat(50));
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('='.repeat(50));
    console.log('\nTest Login Credentials:');
    console.log('─'.repeat(50));
    console.log('ADMIN:    admin@        / Admin@123');
    console.log('TEACHER:  teacher@      / Teacher@123');
    console.log('STUDENT:  student@      / Student@123');
    console.log('─'.repeat(50));
    console.log('\nRelationships:');
    console.log('- Teacher "John Smith" teaches Science and Mathematics in Grade 10 & 11');
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// DISABLED FOR VIVA DEMO
// seedDatabase();
