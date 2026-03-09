const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const reviewController = require('../controllers/reviewController');
const { auth, authenticateToken } = require('../middleware/auth');

/**
 * Optional authentication middleware
 * Verifies token if provided, but doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const isCustomerToken =
        decoded.tokenType === 'customer' ||
        decoded.role === 'customer';

      if (isCustomerToken) {
        req.user = {
          id: decoded.id,
          role: 'customer'
        };
      }
    } catch (error) {
      // Token invalid, but continue without auth
    }
  }
  next();
};

/**
 * @route   POST /api/reviews
 * @desc    Submit customer review
 * @access  Public (with optional authentication for logged-in customers)
 */
router.post(
  '/',
  optionalAuth,
  [
    body('customerName').trim().notEmpty().withMessage('Name is required'),
    body('dish').custom((value, { req }) => {
      if (value || req.body.dishId) {
        return true;
      }
      throw new Error('Please select a dish');
    }),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('reviewText').custom((value, { req }) => {
      const textValue = (value || req.body.comment || '').trim();
      if (!textValue) {
        throw new Error('Review text is required');
      }
      if (textValue.length < 10) {
        throw new Error('Review must be at least 10 characters');
      }
      req.body.reviewText = textValue;
      return true;
    })
  ],
  reviewController.createReview
);

/**
 * @route   GET /api/reviews
 * @desc    Get all reviews (admin)
 * @access  Private
 */
router.get('/', auth, reviewController.getAllReviews);

/**
 * @route   GET /api/reviews/customer/my-reviews
 * @desc    Get current customer's reviews
 * @access  Private
 */
router.get('/customer/my-reviews', authenticateToken, reviewController.getCustomerReviews);

/**
 * @route   GET /api/reviews/dish/:dishId
 * @desc    Get reviews for a specific dish
 * @access  Public
 */
router.get('/dish/:dishId', reviewController.getReviewsByDish);

/**
 * @route   GET /api/reviews/public
 * @desc    Get all visible public reviews
 * @access  Public
 */
router.get('/public', reviewController.getPublicReviews);

/**
 * @route   GET /api/reviews/:id
 * @desc    Get single review
 * @access  Public
 */
router.get('/:id', reviewController.getReviewById);

/**
 * @route   PATCH /api/reviews/:id/visibility
 * @desc    Toggle review visibility
 * @access  Private
 */
router.patch('/:id/visibility', auth, reviewController.toggleVisibility);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  Private
 */
router.delete('/:id', auth, reviewController.deleteReview);

module.exports = router;
