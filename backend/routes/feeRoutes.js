const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { buildUploader } = require('../middleware/uploadMiddleware');

const paymentSlipUpload = buildUploader('payment-slips', {
  allowMime: ['image/', 'application/pdf'],
}).single('slip');

router.use(protect);

router.get('/list', authorize('STUDENT', 'ADMIN'), listFees);
router.get('/my-fees', authorize('STUDENT'), getMyFees);
router.get('/options', authorize('ADMIN'), getFeeOptions);
router.get('/search', authorize('ADMIN', 'STUDENT'), searchFees);

router.post('/create', authorize('ADMIN'), createFee);
router.put('/edit/:id', authorize('ADMIN'), updateFee);
router.delete('/delete/:id', authorize('ADMIN'), deleteFee);
router.post('/verify/:id', authorize('ADMIN'), verifyFee);

router.post('/upload-slip', authorize('STUDENT'), paymentSlipUpload, studentPay);
router.post('/student-pay', authorize('STUDENT'), paymentSlipUpload, studentPay);
router.post('/create-subject-fee', authorize('ADMIN'), createSubjectFee);

module.exports = router;
