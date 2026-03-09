const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { auth } = require('../middleware/auth');

/**
 * @route   GET /api/settings
 * @desc    Get site settings (public)
 * @access  Public
 */
router.get('/', settingsController.getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update site settings
 * @access  Private
 */
router.put('/', auth, settingsController.updateSettings);

module.exports = router;
