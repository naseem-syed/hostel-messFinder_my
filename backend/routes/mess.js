const express = require('express');
const router = express.Router();
const {
  getAllMesses,
  getMessById,
  getOwnerMess,
  createMess,
  updateMess,
  deleteMess,
  getNearbyMesses,
  compareMesses,
  joinMess,
  leaveMess,
  addHostelStudent,
  getHostelStudents,
  getHostelStudentDetails,
  deleteHostelStudent,
  getPendingReviews,
  getJoinedStudents
} = require('../controllers/messController');
const { protect } = require('../middleware/auth');

// ===== PUBLIC ROUTES =====
router.get('/', getAllMesses);

// ===== SPECIFIC ROUTES (must come before :id) =====
router.get('/nearby', getNearbyMesses);
router.get('/compare/:id1/:id2', compareMesses);

// ===== PROTECTED ROUTES =====
// Owner routes
router.get('/owner/my-mess', protect, getOwnerMess);
router.get('/owner/search-student', protect, (req, res) => {
  const User = require('../models/User');
  const email = req.query.email?.toLowerCase();
  User.findOne({ email }).select('name email phone photo_url').then(user => {
    if (user) res.json({ success: true, user });
    else res.json({ success: false, message: 'Student not registered yet.' });
  }).catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Student routes (aliased for root access)
router.post('/join', protect, joinMess);
router.post('/leave', protect, leaveMess);
router.get('/:id/joined-students', protect, getJoinedStudents);

// Compatibility alias routes
router.post('/students/join', protect, joinMess);
router.post('/students/leave', protect, leaveMess);
router.get('/students/joined/:id', protect, getJoinedStudents);

// Mess management (owner only)
router.post('/', protect, createMess);
router.put('/:id', protect, updateMess);
router.delete('/:id', protect, deleteMess);

// Owner verified student management
router.post('/:id/students', protect, addHostelStudent);
router.get('/:id/students', protect, getHostelStudents);
router.get('/:id/students/:studentEmail', protect, getHostelStudentDetails);
router.delete('/:id/students/:studentEmail', protect, deleteHostelStudent);
router.get('/:id/reviews/pending', protect, getPendingReviews);

// ===== GENERIC ROUTE (must be last) =====
router.get('/:id', getMessById);

module.exports = router;
