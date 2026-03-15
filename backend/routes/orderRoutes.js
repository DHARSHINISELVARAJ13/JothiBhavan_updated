const express = require('express');
const orderController = require('../controllers/orderController');
const { auth, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Customer routes
router.post('/', authenticateToken, orderController.placeOrder);
router.post('/payment/create-order', authenticateToken, orderController.createRazorpayOrder);
router.post('/payment/verify', authenticateToken, orderController.verifyRazorpayPayment);
router.get('/my', authenticateToken, orderController.getMyOrders);
router.get('/my/:orderId', authenticateToken, orderController.getMyOrderById);
router.patch('/my/:orderId/cancel', authenticateToken, orderController.cancelOrder);

// Admin routes
router.get('/stats', auth, orderController.getOrderStats);
router.get('/', auth, orderController.getAllOrders);
router.patch('/:orderId/status', auth, orderController.updateOrderStatus);

module.exports = router;
