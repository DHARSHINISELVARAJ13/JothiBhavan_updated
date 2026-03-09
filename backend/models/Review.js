const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    required: true
  },
  dishName: {
    type: String,
    trim: true
  },
  dishCategory: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  reviewText: {
    type: String,
    required: true,
    trim: true
  },
  sentiment: {
    score: {
      type: Number,
      required: true
    },
    comparative: {
      type: Number,
      required: true
    },
    label: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      required: true
    },
    tokens: [String],
    positive: [String],
    negative: [String]
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for faster queries
reviewSchema.index({ dish: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ 'sentiment.label': 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for dashboard queries
reviewSchema.index({ isVisible: 1, createdAt: -1 });
reviewSchema.index({ dish: 1, 'sentiment.label': 1 });

module.exports = mongoose.model('Review', reviewSchema);
