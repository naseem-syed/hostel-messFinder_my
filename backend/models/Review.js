const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: [true, 'Mess ID is required']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    required: [true, 'Please provide a rating']
  },
  hygieneRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  foodQualityRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  staffBehaviorRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  valueForMoneyRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  diningAreaCleanlinessRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  timelinessRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  varietyOfMenuRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  waitingTimeRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  review: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
    required: [true, 'Please provide a review']
  },
  foodImage: {
    type: String, // URL or base64
    default: null
  },
  voiceNote: {
    type: String, // URL or base64
    default: null
  },
  quantity: {
    type: String,
    enum: ['very-less', 'less', 'enough', 'more', 'excellent-quantity'],
    default: 'enough'
  },
  verifiedStudent: {
    type: Boolean,
    default: true // All reviews are from authenticated students
  },
  helpful: {
    type: Number,
    default: 0
  },
  aiMetadata: {
    sentiment: {
      score: Number,
      label: String
    },
    fakeDetection: {
      isFake: Boolean,
      confidence: Number,
      reason: String
    },
    spamDetection: {
      isSpam: Boolean,
      confidence: Number
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// One student can only review a mess once
reviewSchema.index({ userId: 1, messId: 1 }, { unique: true });

// Pre-save hook to update mess ratings
reviewSchema.pre('save', async function(next) {
  if (this.isNew) {
    next();
  } else if (this.isModified()) {
    next();
  } else {
    next();
  }
});

// Static method to calculate average ratings for a mess
reviewSchema.statics.calculateAverageRating = async function(messId) {
  const obj = await this.aggregate([
    { $match: { messId: messId } },
    {
      $group: {
        _id: '$messId',
        averageRating: { $avg: '$rating' },
        averageHygiene: { $avg: '$hygieneRating' },
        averageFood: { $avg: '$foodQualityRating' },
        averageStaff: { $avg: '$staffBehaviorRating' },
        averageValue: { $avg: '$valueForMoneyRating' },
        averageCleaning: { $avg: '$diningAreaCleanlinessRating' },
        averageTimeliness: { $avg: '$timelinessRating' },
        averageVariety: { $avg: '$varietyOfMenuRating' },
        averageWaitingTime: { $avg: '$waitingTimeRating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  try {
    if (obj.length > 0) {
      await mongoose.model('Mess').findByIdAndUpdate(messId, {
        overallRating: Math.round(obj[0].averageRating * 10) / 10,
        hygieneRating: Math.round(obj[0].averageHygiene * 10) / 10,
        foodQualityRating: Math.round(obj[0].averageFood * 10) / 10,
        staffBehaviorRating: Math.round(obj[0].averageStaff * 10) / 10,
        valueForMoneyRating: Math.round(obj[0].averageValue * 10) / 10,
        diningAreaCleanlinessRating: Math.round(obj[0].averageCleaning * 10) / 10,
        timelinessRating: Math.round(obj[0].averageTimeliness * 10) / 10,
        varietyOfMenuRating: Math.round(obj[0].averageVariety * 10) / 10,
        waitingTimeRating: Math.round(obj[0].averageWaitingTime * 10) / 10,
        totalReviews: obj[0].totalReviews
      });
    }
  } catch (error) {
    console.error('Error calculating ratings:', error);
  }
};

// Post-save hook to update mess ratings
reviewSchema.post('save', async function() {
  await this.constructor.calculateAverageRating(this.messId);
});

// Post-findByIdAndUpdate hook
reviewSchema.post('findByIdAndUpdate', async function(doc) {
  if (doc) {
    await doc.constructor.calculateAverageRating(doc.messId);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
