const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

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
    console.log('Existing data cleared');

    // 1. Create Subjects
    const subjects = await Subject.insertMany([
      { name: 'Science' },
      { name: 'Mathematics' },
      { name: 'ICT' },
      { name: 'History' },
      { name: 'Spanish' },
      { name: 'English' }
    ]);
    console.log(`${subjects.length} Subjects created`);

    // 2. Create School Classes (Grade 6 to 11)
    const class6 = await SchoolClass.create({ name: 'Grade 6', description: 'Middle School' });
    const class7 = await SchoolClass.create({ name: 'Grade 7', description: 'Middle School' });
    const class8 = await SchoolClass.create({ name: 'Grade 8', description: 'Middle School' });
    const class9 = await SchoolClass.create({ name: 'Grade 9', description: 'High School' });
    const class10 = await SchoolClass.create({ name: 'Grade 10', description: 'High School' });
    const class11 = await SchoolClass.create({ name: 'Grade 11', description: 'High School' });
    
    console.log('6 School Classes created');

    // 3. Create Users (Admin, Parent, Teacher & Students)
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    const admin = await User.create({
      username: 'admin',
      email: 'admin@learnmate.com',
      password: password,
      name: 'System Admin',
      role: 'ADMIN'
    });

    const teacher = await User.create({
      username: 'mr_smith',
      email: 'smith@teacher.com',
      password: password,
      name: 'John Smith',
      role: 'TEACHER'
    });

    const student1 = await User.create({
      username: 'alice_w',
      email: 'alice@student.com',
      password: password,
      name: 'Alice Wonderland',
      role: 'STUDENT',
      schoolClass: class10._id,
      subjects: [subjects[0]._id, subjects[1]._id]
    });

    const student2 = await User.create({
      username: 'bob_b',
      email: 'bob@student.com',
      password: password,
      name: 'Bob Builder',
      role: 'STUDENT',
      schoolClass: class10._id,
      subjects: [subjects[0]._id, subjects[2]._id]
    });

    const student3 = await User.create({
      username: 'charlie_d',
      email: 'charlie@student.com',
      password: password,
      name: 'Charlie Davis',
      role: 'STUDENT',
      schoolClass: class11._id,
      subjects: [subjects[2]._id]
    });

    const parent = await User.create({
      username: 'parent',
      email: 'parent@learnmate.com',
      password: password,
      name: 'P. Wonderland & Builder',
      role: 'PARENT',
      children: [student1._id, student2._id]
    });

    // Update students to reference parent
    student1.parents.push(parent._id);
    await student1.save();
    student2.parents.push(parent._id);
    await student2.save();

    console.log('Users (Admin, Parent, Teacher and Students) created');

    // Update classes with student references
    class10.students.push(student1._id, student2._id);
    await class10.save();
    class11.students.push(student3._id);
    await class11.save();

    // 4. Create Timetable Entries - Default timetable for all grades
    // School day: Monday-Friday, 08:30-17:30 (5:30 PM)
    // Time slots: 08:30-10:30 (2h), 10:45-12:45 (2h), 13:30-15:30 (2h), 15:45-17:30 (1.75h)
    
    const classes = [class6, class7, class8, class9, class10, class11];
    const timetableData = [];

    // Create a rotation of subjects for each grade and day
    // Subject distribution: Science, Mathematics, ICT, History, Spanish, English
    const subjectRotation = {
      'MONDAY': [
        { subject: subjects[1], title: 'Mathematics', start: '08:30', end: '10:30' },    // 2h
        { subject: subjects[0], title: 'Science', start: '10:45', end: '12:45' },        // 2h
        { subject: subjects[5], title: 'English', start: '13:30', end: '15:30' },        // 2h
        { subject: subjects[3], title: 'History', start: '15:45', end: '17:30' }         // 1h 45m
      ],
      'TUESDAY': [
        { subject: subjects[0], title: 'Science', start: '08:30', end: '10:30' },        // 2h
        { subject: subjects[2], title: 'ICT', start: '10:45', end: '12:45' },            // 2h
        { subject: subjects[4], title: 'Spanish', start: '13:30', end: '15:30' },        // 2h
        { subject: subjects[1], title: 'Mathematics', start: '15:45', end: '17:30' }     // 1h 45m
      ],
      'WEDNESDAY': [
        { subject: subjects[5], title: 'English', start: '08:30', end: '10:30' },        // 2h
        { subject: subjects[3], title: 'History', start: '10:45', end: '12:45' },        // 2h
        { subject: subjects[1], title: 'Mathematics', start: '13:30', end: '15:30' },    // 2h
        { subject: subjects[0], title: 'Science', start: '15:45', end: '17:30' }         // 1h 45m
      ],
      'THURSDAY': [
        { subject: subjects[2], title: 'ICT', start: '08:30', end: '10:30' },            // 2h
        { subject: subjects[5], title: 'English', start: '10:45', end: '12:45' },        // 2h
        { subject: subjects[3], title: 'History', start: '13:30', end: '15:30' },        // 2h
        { subject: subjects[4], title: 'Spanish', start: '15:45', end: '17:30' }         // 1h 45m
      ],
      'FRIDAY': [
        { subject: subjects[4], title: 'Spanish', start: '08:30', end: '10:30' },        // 2h
        { subject: subjects[1], title: 'Mathematics', start: '10:45', end: '12:45' },    // 2h
        { subject: subjects[2], title: 'ICT', start: '13:30', end: '15:30' },            // 2h
        { subject: subjects[0], title: 'Science', start: '15:45', end: '17:30' }         // 1h 45m
      ]
    };

    // Generate timetable for each class and day
    for (const gradeClass of classes) {
      for (const [day, sessions] of Object.entries(subjectRotation)) {
        for (const session of sessions) {
          timetableData.push({
            schoolClass: gradeClass._id,
            teacher: teacher._id,
            subject: session.subject._id,
            title: `${session.title} ${gradeClass.name}`,
            description: `${session.title} class for ${gradeClass.name}`,
            day: day,
            startTime: session.start,
            endTime: session.end,
            room: `Room ${gradeClass.name.split(' ')[1]}-${Math.floor(Math.random() * 9) + 1}`
          });
        }
      }
    }

    const timetables = await Timetable.insertMany(timetableData);
    console.log(`${timetables.length} Timetable entries created (default schedule for all grades)`);

    // 5. Create Exams for different classes and subjects
    const exams = await Exam.insertMany([
      // Grade 10 exams (student1 and student2's class)
      {
        subject: subjects[1]._id,  // Mathematics
        teacher: teacher._id,
        schoolClass: class10._id,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 days from now
        title: 'Mathematics Mid-Term',
        description: 'Comprehensive mid-term exam covering chapters 1-5',
        maxMarks: 100,
        passMark: 40
      },
      {
        subject: subjects[0]._id,  // Science
        teacher: teacher._id,
        schoolClass: class10._id,
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),  // 14 days from now
        title: 'Science Mid-Term',
        description: 'Physics, Chemistry, and Biology sections',
        maxMarks: 100,
        passMark: 40
      },
      {
        subject: subjects[2]._id,  // ICT
        teacher: teacher._id,
        schoolClass: class10._id,
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),  // 21 days from now
        title: 'ICT Practical Examination',
        description: 'Practical exam - Database design and SQL queries',
        maxMarks: 100,
        passMark: 40
      },
      // Grade 11 exams (student3's class)
      {
        subject: subjects[2]._id,  // ICT
        teacher: teacher._id,
        schoolClass: class11._id,
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        title: 'ICT Final Exam',
        description: 'Programming and web development topics',
        maxMarks: 100,
        passMark: 40
      },
      {
        subject: subjects[1]._id,  // Mathematics
        teacher: teacher._id,
        schoolClass: class11._id,
        date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        title: 'Mathematics Final Exam',
        description: 'Calculus, Algebra, and Statistics',
        maxMarks: 100,
        passMark: 40
      }
    ]);

    console.log(`${exams.length} Exams created`);

    // 6. Create Marks for students on their exams
    const marks = await Mark.insertMany([
      // Marks for student1's exams
      {
        student: student1._id,
        exam: exams[0]._id,  // Mathematics Mid-Term (class 10)
        score: 85,
        published: true,
        comments: 'Excellent work on algebra section'
      },
      {
        student: student1._id,
        exam: exams[1]._id,  // Science Mid-Term (class 10)
        score: 78,
        published: true,
        comments: 'Good understanding of concepts'
      },
      // Marks for student2's exams
      {
        student: student2._id,
        exam: exams[0]._id,  // Mathematics Mid-Term (class 10)
        score: 72,
        published: true,
        comments: 'Good progress, work on accuracy'
      },
      {
        student: student2._id,
        exam: exams[2]._id,  // ICT Practical (class 10)
        score: 88,
        published: true,
        comments: 'Outstanding coding skills'
      },
      // Marks for student3's exams
      {
        student: student3._id,
        exam: exams[3]._id,  // ICT Final Exam (class 11)
        score: 91,
        published: true,
        comments: 'Outstanding performance throughout'
      }
    ]);

    console.log(`${marks.length} Mark entries created`);

    // 7. Create Fee Records
    const fees = await Fee.insertMany([
      {
        student: student1._id,
        subject: subjects[0]._id, // Math
        schoolClass: class10._id,
        amount: 150.00,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
        status: 'PENDING'
      },
      {
        student: student1._id,
        subject: subjects[1]._id, // Physics
        schoolClass: class10._id,
        amount: 200.00,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: 'PAID',
        paymentDate: new Date()
      },
      {
        student: student2._id,
        subject: subjects[0]._id, // Math
        schoolClass: class10._id,
        amount: 150.00,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'PENDING'
      }
    ]);
    console.log(`${fees.length} Fee records created`);

    // 8. Create Notifications
    const notifications = await Notification.insertMany([
      {
        title: 'Welcome to Term 2',
        message: 'Welcome everyone! Classes begin formally on Monday. Please ensure all late fees are settled.',
        type: 'SYSTEM',
        createdBy: admin._id
      },
      {
        title: 'Physics Practical Delay',
        message: 'The physics lab is currently undergoing maintenance. Practicals are delayed by one week.',
        type: 'MANUAL',
        targetClass: class10._id,
        createdBy: teacher._id
      }
    ]);
    console.log(`${notifications.length} Notifications created`);

    console.log('--- Database Seeding Completed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
