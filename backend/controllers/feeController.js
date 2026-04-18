const Fee = require('../models/Fee');
const User = require('../models/User');
const Subject = require('../models/Subject');
const SchoolClass = require('../models/SchoolClass');
const { parseIsoDate, toDateOnlyString } = require('../utils/timeUtils');

const FEE_POPULATE = [
  { path: 'student', select: 'name username email role schoolClass' },
  { path: 'subject', select: 'name' },
  { path: 'schoolClass', select: 'name' },
];

const hydrateFees = async (query) => {
  let chain = query;
  FEE_POPULATE.forEach((entry) => {
    chain = chain.populate(entry);
  });
  return chain;
};

const serializeFee = (fee) => ({
  _id: fee._id,
  student: fee.student,
  subject: fee.subject,
  schoolClass: fee.schoolClass,
  amount: fee.amount,
  dueDate: fee.dueDate,
  status: fee.status,
  paymentDate: fee.paymentDate,
  submittedAmount: fee.submittedAmount,
  submittedDate: fee.submittedDate,
  paymentSlipPath: fee.paymentSlipPath,
  createdAt: fee.createdAt,
  updatedAt: fee.updatedAt,
});

const applySlipSubmission = async ({ fee, amount, slipDate, fileName }) => {
  fee.submittedAmount = amount;
  fee.submittedDate = new Date(toDateOnlyString(slipDate));
  fee.paymentSlipPath = fileName;
  fee.status = 'PAID_PENDING';
  fee.paymentDate = new Date();
  await fee.save();
};

const listFees = async (req, res) => {
  try {
    if (req.user.role === 'STUDENT') {
      const studentFees = await hydrateFees(
        Fee.find({ student: req.user.id }).sort({ dueDate: 1 })
      );

      return res.json({ fees: studentFees.map(serializeFee) });
    }

    const fees = await hydrateFees(Fee.find().sort({ dueDate: 1 }));
    res.json({ fees: fees.map(serializeFee) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeeOptions = async (_req, res) => {
  try {
    const [students, subjects, schoolClasses] = await Promise.all([
      User.find({ role: 'STUDENT' }).select('_id name username schoolClass subjects').sort({ name: 1 }),
      Subject.find().select('_id name').sort({ name: 1 }),
      SchoolClass.find().select('_id name').sort({ name: 1 }),
    ]);

    res.json({ students, subjects, schoolClasses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createFee = async (req, res) => {
  try {
    const studentId = req.body.studentId || req.body.student;
    const subjectId = req.body.subjectId || req.body.subject;
    const schoolClassId = req.body.schoolClassId || req.body.schoolClass || req.body.classId;
    const dueDate = parseIsoDate(req.body.dueDate);

    const [student, subject, schoolClass] = await Promise.all([
      User.findById(studentId),
      Subject.findById(subjectId),
      SchoolClass.findById(schoolClassId),
    ]);

    if (!student) {
      return res.status(400).json({ message: 'Student is required' });
    }

    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    if (!schoolClass) {
      return res.status(400).json({ message: 'Grade/Class is required' });
    }

    if (!dueDate) {
      return res.status(400).json({ message: 'Invalid due date' });
    }

    const fee = await Fee.create({
      student: student._id,
      subject: subject._id,
      schoolClass: schoolClass._id,
      amount: Number(req.body.amount),
      dueDate,
      status: req.body.status || 'PENDING',
      paymentDate: req.body.paymentDate ? parseIsoDate(req.body.paymentDate) : null,
    });

    const hydrated = await hydrateFees(Fee.findById(fee._id));
    res.status(201).json({ fee: serializeFee(hydrated) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateFee = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    if (req.body.subjectId || req.body.subject) {
      const subject = await Subject.findById(req.body.subjectId || req.body.subject);
      if (!subject) {
        return res.status(400).json({ message: 'Subject is required' });
      }
      fee.subject = subject._id;
    }

    if (req.body.amount !== undefined) {
      fee.amount = Number(req.body.amount);
    }

    if (req.body.dueDate) {
      const dueDate = parseIsoDate(req.body.dueDate);
      if (!dueDate) {
        return res.status(400).json({ message: 'Invalid due date' });
      }
      fee.dueDate = dueDate;
    }

    if (req.body.status) {
      fee.status = req.body.status;
      if (req.body.status === 'PAID') {
        fee.paymentDate = new Date();
      }
    }

    await fee.save();
    const hydrated = await hydrateFees(Fee.findById(fee._id));
    res.json({ fee: serializeFee(hydrated) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteFee = async (req, res) => {
  try {
    const deleted = await Fee.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Fee not found' });
    }
    res.json({ message: 'Fee deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyFee = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    if (fee.status !== 'PAID_PENDING') {
      return res.status(400).json({ message: 'Only payments pending verification can be verified' });
    }

    fee.status = 'PAID';
    await fee.save();

    const hydrated = await hydrateFees(Fee.findById(fee._id));
    res.json({ message: 'Payment verified successfully.', fee: serializeFee(hydrated) });
  } catch (error) {
    res.status(400).json({ message: `Failed to verify payment: ${error.message}` });
  }
};

const getMyFees = async (req, res) => {
  try {
    const fees = await hydrateFees(
      Fee.find({ student: req.user.id }).sort({ dueDate: 1 })
    );

    const outstandingStatuses = new Set(['PENDING', 'OVERDUE']);
    const outstandingFees = fees.filter((fee) => outstandingStatuses.has(fee.status));
    const historyFees = fees.filter((fee) => !outstandingStatuses.has(fee.status));

    const totalOutstanding = outstandingFees.reduce((sum, fee) => {
      const amount = Number(fee.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    res.json({
      outstandingFees: outstandingFees.map(serializeFee),
      historyFees: historyFees.map(serializeFee),
      totalOutstanding,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchFees = async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'studentId is required' });
    }

    const student = await User.findById(studentId).populate('schoolClass');
    if (!student) {
      return res.status(404).json({ message: `Student not found with ID: ${studentId}` });
    }

    if (req.user.role === 'STUDENT' && String(student._id) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only view your own fees' });
    }

    const fees = await hydrateFees(
      Fee.find({ student: student._id, schoolClass: student.schoolClass?._id || null }).sort({ dueDate: 1 })
    );

    res.json({
      fees: fees.map(serializeFee),
      searchStudentId: studentId,
      searchStudentName: student.name,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const studentPay = async (req, res) => {
  try {
    const feeId = req.body.feeId ? String(req.body.feeId) : null;
    const studentId = req.body.studentId;
    const subjectId = req.body.subjectId;
    const amount = req.body.amount !== undefined ? Number(req.body.amount) : null;
    const slipDate = req.body.slipDate ? parseIsoDate(req.body.slipDate) : null;

    if (amount === null || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Payment amount is required and must be greater than 0.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload the bank slip (image or PDF).' });
    }

    const validMime = req.file.mimetype.startsWith('image/') || req.file.mimetype === 'application/pdf';
    if (!validMime) {
      return res.status(400).json({ message: 'Only image or PDF slips are accepted.' });
    }

    if (!slipDate) {
      return res.status(400).json({ message: 'Slip date is required.' });
    }

    if (feeId) {
      const fee = await Fee.findById(feeId);
      if (!fee) {
        return res.status(404).json({ message: 'Fee not found.' });
      }

      if (String(fee.student) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only pay your own fees' });
      }

      if (!['PENDING', 'OVERDUE'].includes(fee.status)) {
        return res.status(400).json({ message: 'Only pending or overdue fees can be submitted.' });
      }

      if (Math.abs(Number(fee.amount) - amount) > 0.009) {
        return res.status(400).json({
          message: `Entered amount does not match the required fee ($${fee.amount}).`,
        });
      }

      await applySlipSubmission({
        fee,
        amount,
        slipDate,
        fileName: req.file.filename,
      });

      const hydrated = await hydrateFees(Fee.findById(fee._id));
      return res.json({
        message: 'Payment submitted for verification.',
        fee: serializeFee(hydrated),
      });
    }

    const student = await User.findById(studentId);
    const subject = await Subject.findById(subjectId);

    if (!student || !subject) {
      return res.status(404).json({ message: 'Student or subject not found' });
    }

    if (String(student._id) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only pay your own fees' });
    }

    const pendingFee = await Fee.findOne({
      student: student._id,
      subject: subject._id,
      status: { $in: ['PENDING', 'OVERDUE'] },
    }).sort({ dueDate: 1 });

    if (!pendingFee) {
      return res.status(400).json({ message: 'No pending fee found for this subject.' });
    }

    if (Math.abs(Number(pendingFee.amount) - amount) > 0.009) {
      return res.status(400).json({
        message: `Entered amount does not match the required fee ($${pendingFee.amount}).`,
      });
    }

    await applySlipSubmission({
      fee: pendingFee,
      amount,
      slipDate,
      fileName: req.file.filename,
    });

    const hydrated = await hydrateFees(Fee.findById(pendingFee._id));
    res.json({
      message: 'Payment submitted for verification.',
      fee: serializeFee(hydrated),
    });
  } catch (error) {
    res.status(500).json({ message: `Failed to submit payment: ${error.message}` });
  }
};

const createSubjectFee = async (req, res) => {
  try {
    const subjectId = req.body.subjectId;
    const schoolClassId = req.body.schoolClassId;
    const amount = Number(req.body.amount);
    const dueDate = parseIsoDate(req.body.dueDate);

    const [subject, schoolClass] = await Promise.all([
      Subject.findById(subjectId),
      SchoolClass.findById(schoolClassId),
    ]);

    if (!subject || !schoolClass || !dueDate || Number.isNaN(amount)) {
      return res.status(400).json({ message: 'subjectId, schoolClassId, amount and dueDate are required.' });
    }

    const students = await User.find({ role: 'STUDENT', schoolClass: schoolClass._id, subjects: subject._id });

    const rows = students.map((student) => ({
      student: student._id,
      subject: subject._id,
      schoolClass: schoolClass._id,
      amount,
      dueDate: new Date(toDateOnlyString(dueDate)),
      status: 'PENDING',
    }));

    if (rows.length > 0) {
      await Fee.insertMany(rows);
    }

    res.json({
      message: `Created fees for ${rows.length} students in ${schoolClass.name} enrolled in ${subject.name}`,
      createdCount: rows.length,
    });
  } catch (error) {
    res.status(500).json({ message: `Failed to create subject fees: ${error.message}` });
  }
};

module.exports = {
  listFees,
  getFeeOptions,
  createFee,
  updateFee,
  deleteFee,
  verifyFee,
  getMyFees,
  searchFees,
  studentPay,
  createSubjectFee,
};
