const express = require('express');
const { 
  registerCustomer, 
  loginCustomer, 
  getMe, 
  changePassword 
} = require('../controllers/customerAuthController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerCustomer);
router.post('/login', loginCustomer);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
