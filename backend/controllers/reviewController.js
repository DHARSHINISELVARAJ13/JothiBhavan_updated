const { validationResult } = require('express-validator');
const Review = require('../models/Review');
const Dish = require('../models/Dish');
const Order = require('../models/Order');
const { enhancedSentimentAnalysis, resolveSentimentWithRating } = require('../utils/sentimentAnalysis');
const { callSentimentML } = require('../utils/mlService');

/**
 * @desc    Create customer review with sentiment analysis
 * @route   POST /api/reviews
 * @access  Public / Protected (if customerId is sent)
 */
exports.createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      dish: requestDish,
      dishId,
      rating,
      reviewText: requestReviewText,
      comment
    } = req.body;
    const dish = requestDish || dishId;
    const reviewText = requestReviewText || comment;
    const customerId = req.user?.id; // Get customerId from authenticated request if available

    if (!dish || !reviewText) {
      return res.status(400).json({
        success: false,
        message: 'Dish and review text are required'
      });
    }

    // Check if dish exists and is active
    const dishDoc = await Dish.findById(dish);
    if (!dishDoc) {
      return res.status(404).json({ 
        success: false,
        message: 'Dish not found' 
      });
    }

    if (!dishDoc.isActive) {
      return res.status(400).json({ 
        success: false,
        message: 'This dish is currently not available for review' 
      });
    }

    if (customerId) {
      const hasOrderedDish = await Order.exists({
        customerId,
        'items.dish': dish
      });

      if (!hasOrderedDish) {
        return res.status(403).json({
          success: false,
          message: 'You can only review dishes you have ordered'
        });
      }
    }

    const fallbackSentiment = enhancedSentimentAnalysis(reviewText, rating);
    let sentiment = fallbackSentiment;

    try {
      const mlSentiment = await callSentimentML(reviewText);
      if (mlSentiment && mlSentiment.label) {
        if (mlSentiment.fallback) {
          sentiment = fallbackSentiment;
        } else {
          const mlProbabilities = mlSentiment.probabilities || {};
          const probabilityScore = (Number(mlProbabilities.positive || 0) - Number(mlProbabilities.negative || 0)) * 5;
          const tokenCount = Math.max(String(reviewText || '').split(/\s+/).filter(Boolean).length, 1);

          const mlBasedSentiment = {
            score: Number(probabilityScore.toFixed(4)),
            comparative: Number((probabilityScore / tokenCount).toFixed(6)),
            label: mlSentiment.label,
            tokens: String(reviewText || '').toLowerCase().split(/\s+/).filter(Boolean),
            positive: [],
            negative: []
          };

          sentiment = resolveSentimentWithRating({
            reviewText,
            rating,
            fallbackSentiment,
            mlSentiment: mlBasedSentiment,
            mlMeta: mlSentiment
          });
        }
      }
    } catch (mlError) {
      console.error('ML sentiment unavailable, using fallback:', mlError.message);
      sentiment = fallbackSentiment;
    }

    if ((rating <= 2 && sentiment.label === 'positive') || (rating >= 4 && sentiment.label === 'negative')) {
      sentiment = fallbackSentiment;
    }

    // Create review with optional customerId
    const reviewData = {
      customerName,
      customerEmail,
      customerPhone,
      dish,
      dishName: dishDoc.name,
      dishCategory: dishDoc.category,
      rating,
      reviewText,
      sentiment: {
        score: sentiment.score,
        comparative: sentiment.comparative,
        label: sentiment.label,
        tokens: sentiment.tokens,
        positive: sentiment.positive,
        negative: sentiment.negative
      }
    };

    // Add customerId if authenticated
    if (customerId) {
      reviewData.customerId = customerId;
    }

    // Create review
    const review = await Review.create(reviewData);

    // Populate dish details
    await review.populate('dish', 'name category');

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Your review has been submitted.',
      data: review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while submitting review' 
    });
  }
};

/**
 * @desc    Get all reviews (with filters)
 * @route   GET /api/reviews
 * @access  Private
 */
exports.getAllReviews = async (req, res) => {
  try {
    const { sentiment, dish, rating, limit, page = 1 } = req.query;
    
    let query = {};
    
    if (sentiment && sentiment !== 'all') {
      query['sentiment.label'] = sentiment;
    }
    
    if (dish) {
      query.dish = dish;
    }
    
    if (rating) {
      query.rating = parseInt(rating);
    }

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = limit !== undefined ? Math.max(parseInt(limit, 10) || 50, 1) : null;
    const skip = parsedLimit ? (parsedPage - 1) * parsedLimit : 0;

    let reviewsQuery = Review.find(query)
      .populate('dish', 'name category price')
      .sort({ createdAt: -1 });

    if (parsedLimit) {
      reviewsQuery = reviewsQuery.skip(skip).limit(parsedLimit);
    }

    const reviews = await reviewsQuery;

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      count: reviews.length,
      total,
      page: parsedPage,
      pages: parsedLimit ? Math.ceil(total / parsedLimit) : 1,
      data: reviews
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Get current customer's reviews
 * @route   GET /api/reviews/customer/my-reviews
 * @access  Private
 */
exports.getCustomerReviews = async (req, res) => {
  try {
    const customerId = req.user.id;
    console.log('[getCustomerReviews] Fetching reviews for customer:', customerId);
    
    // Get reviews for the authenticated customer only, exclude deleted dishes
    const reviews = await Review.find({ customerId })
      .populate('dish', 'name category price')
      .sort({ createdAt: -1 });

    // Filter out reviews where dish is null (deleted dishes)
    const activeReviews = reviews.filter(review => review.dish !== null);

    console.log('[getCustomerReviews] Found', reviews.length, 'total reviews,', activeReviews.length, 'active');

    res.json({
      success: true,
      count: activeReviews.length,
      data: activeReviews
    });
  } catch (error) {
    console.error('Get customer reviews error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Get reviews for specific dish
 * @route   GET /api/reviews/dish/:dishId
 * @access  Public
 */
exports.getReviewsByDish = async (req, res) => {
  try {
    const reviews = await Review.find({ 
      dish: req.params.dishId,
      isVisible: true 
    })
      .populate('dish', 'name category')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Get reviews by dish error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Get all public visible reviews
 * @route   GET /api/reviews/public
 * @access  Public
 */
exports.getPublicReviews = async (req, res) => {
  try {
    const { dish, limit = 20, page = 1 } = req.query;

    const query = { isVisible: true };
    if (dish) {
      query.dish = dish;
    }

    const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('dish', 'name category price imageUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Review.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: reviews.length,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      data: reviews
    });
  } catch (error) {
    console.error('Get public reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get single review
 * @route   GET /api/reviews/:id
 * @access  Public
 */
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('dish', 'name category price imageUrl');

    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: 'Review not found' 
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Get review by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Toggle review visibility
 * @route   PATCH /api/reviews/:id/visibility
 * @access  Private
 */
exports.toggleVisibility = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: 'Review not found' 
      });
    }

    review.isVisible = !review.isVisible;
    review.updatedAt = Date.now();
    await review.save();

    res.json({
      success: true,
      message: `Review ${review.isVisible ? 'shown' : 'hidden'} successfully`,
      data: review
    });
  } catch (error) {
    console.error('Toggle visibility error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: 'Review not found' 
      });
    }

    await review.deleteOne();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};