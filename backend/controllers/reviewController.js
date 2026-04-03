const Review = require('../models/Review');
const Mess = require('../models/Mess');

// @desc    Get all reviews for a mess
// @route   GET /api/reviews/mess/:messId
// @access  Public
exports.getReviewsByMess = async (req, res) => {
  try {
    const reviews = await Review.find({ messId: req.params.messId })
      .populate('userId', 'name college photo_url')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/user/my-reviews
// @access  Private
exports.getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.userId })
      .populate('messId', 'name location monthlyPrice foodType overallRating')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// @desc    Get single user's review for a specific mess
// @route   GET /api/reviews/user/:userId/:messId
// @access  Private
exports.getSingleUserReview = async (req, res) => {
  try {
    const { userId, messId } = req.params;

    // Security check: user can only fetch their own review unless they are admin/owner
    if (req.userId !== userId) {
      const user = await require('../models/User').findById(req.userId);
      if (user.role !== 'admin' && user.role !== 'hostel_owner') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this review'
        });
      }
    }

    const review = await Review.findOne({ userId, messId })
      .populate('messId', 'name location');

    res.status(200).json({
      success: true,
      data: review || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching review',
      error: error.message
    });
  }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const {
      messId,
      rating,
      hygieneRating,
      foodQualityRating,
      staffBehaviorRating,
      valueForMoneyRating,
      diningAreaCleanlinessRating,
      timelinessRating,
      varietyOfMenuRating,
      waitingTimeRating,
      review,
      quantity,
      foodImage,
      voiceNote
    } = req.body;

    // Validation
    if (!messId || !rating || !review) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if mess exists
    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({
        success: false,
        message: 'Mess not found'
      });
    }

    // Check if user already reviewed this mess
    const existingReview = await Review.findOne({
      userId: req.userId,
      messId: messId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this mess. Edit your existing review instead.'
      });
    }

    // 1. Fetch the user details
    const User = require('../models/User');
    const student = await User.findById(req.userId);

    // Check if student is verified and linked to this hostel
    if (!student.isVerified || student.joinedMessId?.toString() !== messId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to review this hostel. Please ensure you are verified by the owner.'
      });
    }
    
    // 2. Fetch the HostelStudent record matching the messId and student email
    const HostelStudent = require('../models/HostelStudent');
    const verifiedStudent = await HostelStudent.findOne({ 
      hostel_id: messId, 
      student_email: student.email.toLowerCase(),
      phone: student.phone 
    });

    if (!verifiedStudent) {
      return res.status(403).json({
        success: false,
        message: 'Verification record not found. Please contact the hostel owner.'
      });
    }

    // 3. AI Face Verification
    const aiService = require('../services/aiService');
    const aiResult = await aiService.verifyFace(student.photo_url, verifiedStudent.photo_url);

    if (!aiResult.match) {
      return res.status(403).json({
        success: false,
        message: `Face verification failed (Score: ${aiResult.score}%). Please ensure your profile photo matches the owner's records.`,
        score: aiResult.score
      });
    }

    // 4. Perform AI Sentiment and Fake Detection
    const sentiment = await aiService.analyzeSentiment(review);
    const fakeCheck = await aiService.detectFakeReview(review, req.userId, messId);

    // Additional backend check for duplicate reviews if necessary (already handled by unique index)
    if (fakeCheck.isFake) {
      console.warn(`[AI ALERT] Fake review detected from user ${req.userId}: ${fakeCheck.reason}`);
    }

    // Create review with pending status
    const newReview = await Review.create({
      userId: req.userId,
      messId: messId,
      rating,
      hygieneRating: hygieneRating || rating,
      foodQualityRating: foodQualityRating || rating,
      staffBehaviorRating: staffBehaviorRating || rating,
      valueForMoneyRating: valueForMoneyRating || rating,
      diningAreaCleanlinessRating: diningAreaCleanlinessRating || rating,
      timelinessRating: timelinessRating || rating,
      varietyOfMenuRating: varietyOfMenuRating || rating,
      waitingTimeRating: waitingTimeRating || rating,
      review,
      quantity: quantity || 'medium',
      foodImage: foodImage || null,
      voiceNote: voiceNote || null,
      verifiedStudent: true,
      status: 'approved',
      aiMetadata: {
        sentiment: {
          score: sentiment.score,
          label: sentiment.label
        },
        fakeDetection: {
          isFake: fakeCheck.isFake,
          confidence: fakeCheck.confidence,
          reason: fakeCheck.reason
        }
      }
    });

    await newReview.populate('userId', 'name college photo_url');

    res.status(201).json({
      success: true,
      data: newReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:reviewId
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    let review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update review
    review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'name college');

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:reviewId
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    const messId = review.messId;
    await Review.findByIdAndDelete(req.params.reviewId);

    // Recalculate ratings
    await Review.calculateAverageRating(messId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  }
};

// @desc    Get review count by mess
// @route   GET /api/reviews/stats/:messId
// @access  Public
exports.getReviewStats = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      { $match: { messId: require('mongoose').Types.ObjectId(req.params.messId) } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || { totalReviews: 0, averageRating: 0 }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching review stats',
      error: error.message
    });
  }
};

// @desc    Approve or reject a review
// @route   PUT /api/reviews/owner/:reviewId/status
// @access  Private (Owner only)
exports.approveReview = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const review = await Review.findById(req.params.reviewId).populate('messId', 'ownerId name').populate('userId', 'name email');
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check ownership
    if (review.messId.ownerId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to approve this review' });
    }

    review.status = status;
    await review.save();

    // If rejected, send notification email
    if (status === 'rejected') {
      const sendEmail = require('../services/emailService');
      await sendEmail({
        email: review.userId.email,
        subject: `Your review for ${review.messId.name} was rejected`,
        message: `Hello ${review.userId.name},\n\nThe hostel owner of ${review.messId.name} has rejected your review. You are not authorized to review this hostel or the review violates our policies.`
      }).catch(err => console.error('Email failed to send:', err));
    }

    res.status(200).json({ success: true, message: `Review ${status} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating review status', error: error.message });
  }
};

