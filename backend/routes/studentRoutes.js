const express = require('express');
const router = express.Router();
const { leaveMess, getJoinedStudents } = require('../controllers/messController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Mess = require('../models/Mess');

// User Join/Leave routes
// Root: POST /students/join (Requested by user)
router.post('/join', async (req, res) => {
  try {
    const { studentId, messId } = req.body;

    if (!studentId || !messId || studentId === 'undefined' || messId === 'undefined') {
      return res.status(400).json({ message: 'studentId and messId are required and must be valid' });
    }

    const student = await User.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Logic: check joinedMessId (actual model field) or messId (alias)
    if (student.joinedMessId) {
      return res.status(400).json({
        message: 'You have already joined a hostel. Leave it before joining another.'
      });
    }

    const mess = await Mess.findById(messId);
    if (!mess) return res.status(404).json({ message: 'Hostel not found' });

    student.joinedMessId = messId;
    student.joinedVia = "browse";
    await student.save();

    // Add to Mess list
    if (!mess.joinedStudents.includes(studentId)) {
        mess.joinedStudents.push(studentId);
        await mess.save();
    }

    res.json({ message: 'Joined successfully' });

  } catch (error) {
    console.error('join error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/leave', protect, leaveMess);
router.get('/joined/:id', protect, getJoinedStudents);

module.exports = router;
