const express = require('express');
const router = express.Router();
const {
  getReviewsByMess,
  getUserReviews,
  getSingleUserReview,
  createReview,
  updateReview,
  deleteReview,
  getReviewStats,
  approveReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/mess/:messId', getReviewsByMess);
router.get('/:messId', getReviewsByMess); // Alias for convenience
router.get('/stats/:messId', getReviewStats);

// Protected routes
router.post('/', protect, createReview);
router.post('/add', protect, createReview); // Alias for convenience
router.get('/user/my-reviews', protect, getUserReviews);
router.get('/user/:userId/:messId', protect, getSingleUserReview);
router.put('/:reviewId', protect, updateReview);
router.delete('/:reviewId', protect, deleteReview);

// Owner route
router.put('/owner/:reviewId/status', protect, approveReview);

module.exports = router;
