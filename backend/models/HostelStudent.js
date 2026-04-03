const mongoose = require('mongoose');

const hostelStudentSchema = new mongoose.Schema({
  hostel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: [true, 'Hostel ID is required']
  },
  student_email: {
    type: String,
    required: [true, 'Student email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Student phone number is required'],
    match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
  },
  photo_url: {
    type: String,
    required: [true, 'Student photo is required for face verification'],
    // Base64 image uploaded by owner
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a student is only added once per hostel
hostelStudentSchema.index({ hostel_id: 1, student_email: 1 }, { unique: true });

module.exports = mongoose.model('HostelStudent', hostelStudentSchema);
