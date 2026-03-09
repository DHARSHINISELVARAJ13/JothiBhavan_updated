const express = require('express');
const recommendationController = require('../controllers/recommendationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/my', authenticateToken, recommendationController.getRecommendations);
router.get('/popular', recommendationController.getPopularDishes);

module.exports = router;
