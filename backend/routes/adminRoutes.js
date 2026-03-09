const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth } = require('../middleware/auth');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard analytics
 * @access  Private
 */
router.get('/dashboard', auth, adminController.getDashboardAnalytics);

/**
 * @route   GET /api/admin/sentiment-trends
 * @desc    Get sentiment trends over time
 * @access  Private
 */
router.get('/sentiment-trends', auth, adminController.getSentimentTrends);

/**
 * @route   GET /api/admin/dish-analytics/:dishId
 * @desc    Get detailed analytics for specific dish
 * @access  Private
 */
router.get('/dish-analytics/:dishId', auth, adminController.getDishAnalytics);

module.exports = router;
