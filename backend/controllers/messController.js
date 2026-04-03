const Mess = require('../models/Mess');

// @desc    Get all messes (for students/public)
// @route   GET /api/messes
// @access  Public
exports.getAllMesses = async (req, res) => {
  try {
    const { search, priceMin, priceMax, foodType, ratingMin } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    if (priceMin || priceMax) {
      filter.monthlyPrice = {};
      if (priceMin) filter.monthlyPrice.$gte = Number(priceMin);
      if (priceMax) filter.monthlyPrice.$lte = Number(priceMax);
    }

    if (foodType) {
      filter.foodType = foodType;
    }

    if (ratingMin) {
      filter.overallRating = { $gte: Number(ratingMin) };
    }

    console.log('getAllMesses - Filter:', filter);
    const messes = await Mess.find(filter).populate('ownerId', 'name email phone').sort({ createdAt: -1 });

    console.log(`getAllMesses - Found ${messes.length} messes`);
    res.status(200).json({
      success: true,
      count: messes.length,
      data: messes
    });
  } catch (error) {
    console.error('getAllMesses - Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching messes',
      error: error.message
    });
  }
};

// @desc    Get owner's mess
// @route   GET /api/messes/owner/my-mess
// @access  Private (Owner only)
exports.getOwnerMess = async (req, res) => {
  try {
    console.log('getOwnerMess - Looking for mess with ownerId:', req.userId);
    const mess = await Mess.findOne({ ownerId: req.userId }).populate('ownerId', 'name email phone').populate('joinedStudents', 'name email phone photo_url');
    
    if (!mess) {
      console.warn('getOwnerMess - No mess found for owner:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'No mess found. Please create a mess first.'
      });
    }
    
    console.log('getOwnerMess - Found mess:', mess._id);
    res.status(200).json({
      success: true,
      data: mess
    });
  } catch (error) {
    console.error('getOwnerMess - Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching mess',
      error: error.message
    });
  }
};

// @desc    Get single mess by ID
// @route   GET /api/messes/:id
// @access  Public
exports.getMessById = async (req, res) => {
  try {
    console.log('getMessById - Fetching mess:', req.params.id);
    const mess = await Mess.findById(req.params.id).populate('ownerId', 'name email phone');

    if (!mess) {
      console.warn('getMessById - Mess not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Mess not found'
      });
    }

    console.log('getMessById - Mess found:', mess._id);
    res.status(200).json({
      success: true,
      data: mess
    });
  } catch (error) {
    console.error('getMessById - Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching mess',
      error: error.message
    });
  }
};

// @desc    Create new mess
// @route   POST /api/messes
// @access  Private (Owner only)
exports.createMess = async (req, res) => {
  try {
    const { name, location, address, monthlyPrice, foodType, description, phoneNumber, website, capacity, facilities, foodSchedule } = req.body;

    console.log('createMess - Creating mess for user:', req.userId);
    console.log('createMess - Data:', { name, location, monthlyPrice, foodType });

    // Verify user is a hostel owner
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'hostel_owner') {
      return res.status(403).json({
        success: false,
        message: 'Only hostel owners can create a mess listing'
      });
    }

    if (!name || !location || monthlyPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if owner already has a mess
    const existingMess = await Mess.findOne({ ownerId: req.userId });
    if (existingMess) {
      return res.status(400).json({
        success: false,
        message: 'You already have a mess listed. Please edit your existing mess.'
      });
    }

    const messData = {
      name,
      location,
      address: address || location,
      monthlyPrice,
      foodType: foodType || 'Both',
      description,
      phoneNumber,
      website,
      capacity,
      facilities: facilities || [],
      ownerId: req.userId
    };

    // Add food schedule if provided
    if (foodSchedule) {
      messData.foodSchedule = foodSchedule;
    }

    console.log('createMess - messData ownerId:', messData.ownerId);
    const mess = await Mess.create(messData);

    console.log('createMess - Mess created with ID:', mess._id);

    // Update user with messOwnedId
    await User.findByIdAndUpdate(req.userId, { messOwnedId: mess._id });

    console.log('createMess - Successfully created mess');
    res.status(201).json({
      success: true,
      data: mess
    });
  } catch (error) {
    console.error('createMess - Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating mess',
      error: error.message
    });
  }
};

// @desc    Update mess
// @route   PUT /api/messes/:id
// @access  Private (Owner only)
exports.updateMess = async (req, res) => {
  try {
    console.log('updateMess - Updating mess:', req.params.id, 'by user:', req.userId);
    
    const mess = await Mess.findById(req.params.id);

    if (!mess) {
      return res.status(404).json({
        success: false,
        message: 'Mess not found'
      });
    }

    // Verify ownership
    if (mess.ownerId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this mess'
      });
    }

    const updatedMess = await Mess.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    console.log('updateMess - Successfully updated mess:', req.params.id);
    res.status(200).json({
      success: true,
      data: updatedMess
    });
  } catch (error) {
    console.error('updateMess - Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating mess',
      error: error.message
    });
  }
};

// @desc    Delete mess
// @route   DELETE /api/messes/:id
// @access  Private (Owner only)
exports.deleteMess = async (req, res) => {
  try {
    console.log('deleteMess - Deleting mess:', req.params.id, 'by user:', req.userId);
    
    const mess = await Mess.findById(req.params.id);

    if (!mess) {
      return res.status(404).json({
        success: false,
        message: 'Mess not found'
      });
    }

    // Verify ownership
    if (mess.ownerId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this mess'
      });
    }

    await Mess.findByIdAndDelete(req.params.id);

    // Update user record
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.userId, { messOwnedId: null });

    console.log('deleteMess - Successfully deleted mess:', req.params.id);
    res.status(200).json({
      success: true,
      message: 'Mess deleted successfully'
    });
  } catch (error) {
    console.error('deleteMess - Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting mess',
      error: error.message
    });
  }
};

// @desc    Get nearby messes by coordinates
// @route   GET /api/messes/nearby
// @access  Public
exports.getNearbyMesses = async (req, res) => {
  try {
    const { latitude, longitude, distance } = req.query;
    
    console.log('getNearbyMesses - Query:', { latitude, longitude, distance });
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Distance in meters (default 5km)
    const maxDistance = distance ? Number(distance) * 1000 : 5000;

    const messes = await Mess.find({
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(longitude), Number(latitude)]
          },
          $maxDistance: maxDistance
        }
      }
    }).sort({ createdAt: -1 });

    console.log('getNearbyMesses - Found', messes.length, 'messes');
    res.status(200).json({
      success: true,
      count: messes.length,
      data: messes
    });
  } catch (error) {
    console.error('getNearbyMesses - Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby messes',
      error: error.message
    });
  }
};

// @desc    Compare two messes
// @route   GET /api/messes/compare/:id1/:id2
// @access  Public
exports.compareMesses = async (req, res) => {
  try {
    const { id1, id2 } = req.params;
    console.log('compareMesses - Comparing messes:', { id1, id2 });

    const mess1 = await Mess.findById(id1);
    const mess2 = await Mess.findById(id2);

    if (!mess1 || !mess2) {
      console.warn('compareMesses - One or both messes not found');
      return res.status(404).json({
        success: false,
        message: 'One or both messes not found'
      });
    }

    console.log('compareMesses - Both messes found');
    res.status(200).json({
      success: true,
      data: {
        mess1,
        mess2
      }
    });
  } catch (error) {
    console.error('compareMesses - Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error comparing messes',
      error: error.message
    });
  }
};

// @desc    Join a mess
// @route   POST /api/messes/join
// @access  Private (Student only)
exports.joinMess = async (req, res) => {
  try {
    const studentId = req.userId;
    const { messId } = req.body;

    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required' });
    }

    const User = require('../models/User');
    const student = await User.findById(studentId);

    // 1. Logic: One student -> one hostel ONLY
    if (student.joinedMessId) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined a hostel. Leave it before joining another.'
      });
    }

    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({
        success: false,
        message: 'Mess not found'
      });
    }

    // 2. Assign: student.messId = messId, joinedVia = "browse"
    student.joinedMessId = messId;
    student.joinedVia = 'browse';
    student.isVerified = false; // All browse joins start as unverified
    await student.save();

    // 3. Add student to mess's joined list
    if (!mess.joinedStudents.includes(studentId)) {
      mess.joinedStudents.push(studentId);
      await mess.save();
    }

    res.status(200).json({
      success: true,
      message: 'Successfully joined hostel',
      user: {
        id: student._id,
        name: student.name,
        joinedMessId: student.joinedMessId,
        joinedVia: student.joinedVia
      }
    });
  } catch (error) {
    console.error('joinMess error:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining mess',
      error: error.message
    });
  }
};

// @desc    Leave current mess
// @route   POST /api/messes/leave
// @access  Private (Student only)
exports.leaveMess = async (req, res) => {
  try {
    const studentId = req.userId;

    const User = require('../models/User');
    const student = await User.findById(studentId);
    const messId = student.joinedMessId;

    if (!messId) {
      return res.status(400).json({
        success: false,
        message: 'You are not in any hostel'
      });
    }

    // 1. Clear from mess.joinedStudents
    const mess = await Mess.findById(messId);
    if (mess) {
      mess.joinedStudents = mess.joinedStudents.filter(id => id.toString() !== studentId.toString());
      await mess.save();
    }

    // 2. Clear student's mess data
    student.joinedMessId = null;
    student.joinedVia = null;
    student.isVerified = false;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Successfully left the mess'
    });
  } catch (error) {
    console.error('leaveMess error:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving mess',
      error: error.message
    });
  }
};

// @desc    Get all students joined to a mess
// @route   GET /api/messes/:id/joined-students
// @access  Private (Owner only)
exports.getJoinedStudents = async (req, res) => {
  try {
    const messId = req.params.id;
    const User = require('../models/User');
    
    // Find all students linking to this messId
    const students = await User.find({ joinedMessId: messId }).select('name email phone photo_url joinedVia isVerified');

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching joined students',
      error: error.message
    });
  }
};

// @desc    Add verified student to a hostel
// @route   POST /api/messes/:id/students
// @access  Private (Owner only)
exports.addHostelStudent = async (req, res) => {
  try {
    const messId = req.params.id;
    const { student_email, phone, photo_url } = req.body;

    const mess = await Mess.findById(messId);
    if (!mess || mess.ownerId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized or mess not found' });
    }

    const HostelStudent = require('../models/HostelStudent');
    const User = require('../models/User');
    
    // Check if student exists as a registered user
    const registeredUser = await User.findOne({ email: student_email.toLowerCase() });
    
    // If user exists, we MUST use their official phone number or at least ensure it matches
    // This prevents the owner from entering a "wrong" phone number for an existing user
    if (registeredUser && registeredUser.phone !== phone) {
      return res.status(400).json({ 
        success: false, 
        message: `Phone number mismatch for ${student_email}. This student is registered with phone ending in ...${registeredUser.phone.slice(-4)}. Please use their official registered number.`
      });
    }

    // Check if already added to this hostel (email or phone)
    const existingEmail = await HostelStudent.findOne({ hostel_id: messId, student_email: student_email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Student with this email is already verified for this hostel' });
    }

    const existingPhone = await HostelStudent.findOne({ hostel_id: messId, phone });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Student with this phone number is already verified for this hostel' });
    }

    // AI Face Detection Validation
    if (photo_url) {
      const aiService = require('../services/aiService');
      const faceResult = await aiService.detectHumanFace(photo_url);
      if (!faceResult.hasFace) {
        return res.status(400).json({
          success: false,
          message: faceResult.message
        });
      }
    }

    const student = await HostelStudent.create({
      hostel_id: messId,
      student_email: student_email.toLowerCase(),
      phone,
      photo_url
    });

    // AUTO-LINK REGISTERED USER TO HOSTEL
    if (registeredUser) {
      registeredUser.joinedMessId = messId;
      registeredUser.joinedVia = 'owner';
      registeredUser.isVerified = true;
      await registeredUser.save();

      // Also add to Mess joinedStudents list if not already there
      if (!mess.joinedStudents.includes(registeredUser._id)) {
        mess.joinedStudents.push(registeredUser._id);
        await mess.save();
      }
    }

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding student', error: error.message });
  }
};

// @desc    Delete verified student
// @route   DELETE /api/messes/:id/students/:studentEmail
// @access  Private (Owner only)
exports.deleteHostelStudent = async (req, res) => {
  try {
    const messId = req.params.id;
    const studentEmail = req.params.studentEmail.toLowerCase();

    const mess = await Mess.findById(messId);
    if (!mess || mess.ownerId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized or mess not found' });
    }

    const HostelStudent = require('../models/HostelStudent');
    const User = require('../models/User');

    // Remove from verified list
    await HostelStudent.findOneAndDelete({ hostel_id: messId, student_email: studentEmail });

    // Unlink registered user
    const registeredUser = await User.findOne({ email: studentEmail });
    if (registeredUser && registeredUser.joinedMessId?.toString() === messId) {
      registeredUser.joinedMessId = null;
      registeredUser.isVerified = false;
      await registeredUser.save();

      // Also remove from Mess joinedStudents list
      mess.joinedStudents = mess.joinedStudents.filter(id => id.toString() !== registeredUser._id.toString());
      await mess.save();
    }

    res.status(200).json({ success: true, message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting student', error: error.message });
  }
};

// @desc    Get verified student details
// @route   GET /api/messes/:id/students/:studentEmail
// @access  Private (Owner only)
exports.getHostelStudentDetails = async (req, res) => {
  try {
    const messId = req.params.id;
    const studentEmail = req.params.studentEmail.toLowerCase();

    const mess = await Mess.findById(messId);
    if (!mess || mess.ownerId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized or mess not found' });
    }

    const HostelStudent = require('../models/HostelStudent');
    const User = require('../models/User');

    const verifiedData = await HostelStudent.findOne({ hostel_id: messId, student_email: studentEmail });
    const registeredData = await User.findOne({ email: studentEmail });

    if (!verifiedData) {
      return res.status(404).json({ success: false, message: 'Student not found in verified list' });
    }

    res.status(200).json({
      success: true,
      data: {
        email: verifiedData.student_email,
        phone: verifiedData.phone,
        photo_url: verifiedData.photo_url,
        dateVerified: verifiedData.createdAt,
        isRegistered: !!registeredData,
        registeredName: registeredData ? registeredData.name : 'Not registered yet',
        hostelName: mess.name
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching student details', error: error.message });
  }
};

// @desc    Get verified students for a hostel
// @route   GET /api/messes/:id/students
// @access  Private (Owner only)
exports.getHostelStudents = async (req, res) => {
  try {
    const messId = req.params.id;
    const mess = await Mess.findById(messId);
    
    if (!mess || mess.ownerId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized or mess not found' });
    }

    const HostelStudent = require('../models/HostelStudent');
    const User = require('../models/User');

    const students = await HostelStudent.find({ hostel_id: messId }).sort({ createdAt: -1 });
    
    // Map to include names if registered
    const studentsWithNames = await Promise.all(students.map(async (s) => {
      const user = await User.findOne({ email: s.student_email });
      return {
        ...s._doc,
        name: user ? user.name : 'Not registered yet'
      };
    }));

    res.status(200).json({ success: true, count: studentsWithNames.length, data: studentsWithNames });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
};

// @desc    Get pending reviews for owner
// @route   GET /api/messes/:id/reviews/pending
// @access  Private (Owner only)
exports.getPendingReviews = async (req, res) => {
  try {
    const messId = req.params.id;
    
    const mess = await Mess.findById(messId);
    if (!mess || mess.ownerId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized or mess not found' });
    }

    const Review = require('../models/Review');
    
    // FETCH PENDING REVIEWS: populate user but EXCLUDE review string and ratings
    const pendingReviews = await Review.find({ messId, status: 'pending' })
      .select('-review -rating -hygieneRating -foodQualityRating -staffBehaviorRating -valueForMoneyRating -diningAreaCleanlinessRating -timelinessRating')
      .populate('userId', 'name email photo_url');

    res.status(200).json({ success: true, count: pendingReviews.length, data: pendingReviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pending reviews', error: error.message });
  }
};
