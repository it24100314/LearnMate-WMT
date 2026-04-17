const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    console.log('🧪 Testing Exam Visibility Fix\n');

    // Step 1: Login as student@
    console.log('1️⃣ Logging in as student@...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'student@',
      password: 'Student@123'
    });

    if (loginRes.status !== 200) {
      console.error('❌ Login failed:', loginRes.data);
      process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Fetch exams with auth
    console.log('2️⃣ Fetching exams for student...');
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/exams/list',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const examsRes = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (examsRes.status !== 200) {
      console.error('❌ Fetch exams failed:', examsRes.data);
      process.exit(1);
    }

    console.log('✅ Exams fetched successfully');

    // Step 3: Check results
    const { exams } = examsRes.data;
    console.log(`\n📚 Found ${exams.length} exam(s)\n`);

    if (exams.length === 0) {
      console.log('❌ ERROR: Student should see at least 1 exam (Science Mid-Term)');
      console.log('   BUG NOT FIXED!');
      process.exit(1);
    }

    exams.forEach((exam, i) => {
      console.log(`   Exam ${i + 1}: "${exam.title}"`);
      console.log(`   - Subject: ${exam.subject?.name}`);
      console.log(`   - Class: ${exam.schoolClass?.name}`);
      console.log(`   - Teacher: ${exam.teacher?.name}`);
      console.log(`   - Max Marks: ${exam.maxMarks}\n`);
    });

    // Verify Science exam is visible
    const scienceExam = exams.find(e => e.title === 'Science Mid-Term Exam');
    if (!scienceExam) {
      console.log('❌ ERROR: Science Mid-Term Exam not found in results');
      process.exit(1);
    }

    if (scienceExam.subject?.name !== 'Science') {
      console.log('❌ ERROR: Exam subject mismatch');
      process.exit(1);
    }

    if (scienceExam.schoolClass?.name !== 'Grade 10') {
      console.log('❌ ERROR: Exam class mismatch');
      process.exit(1);
    }

    console.log('✅ ✅ ✅ SUCCESS: EXAM VISIBILITY BUG IS FIXED! ✅ ✅ ✅');
    console.log('\nStudent can now see the exam created by teacher for their grade/subject');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

test();
