const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');

/**
 * Generic token authentication middleware
 * Works for both admin and customer
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('[Auth] No token provided');
      return res.status(401).json({ 
        success: false,
        message: 'No authentication token, access denied' 
      });
    }

    console.log('[Auth] Token received, verifying...');
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[Auth] Token verified for user:', decoded.id, 'Role:', decoded.role);

    if (decoded.tokenType && decoded.tokenType !== 'customer') {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    if (decoded.role && decoded.role !== 'customer') {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    const customer = await Customer.findById(decoded.id).select('_id role isActive');
    if (!customer || customer.role !== 'customer' || !customer.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Customer not found or inactive'
      });
    }

    // Attach user info to request
    req.user = {
      id: customer._id,
      role: customer.role
    };

    next();
  } catch (error) {
    console.error('[Auth] Token verification error:', error.message);
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

/**
 * Middleware to verify JWT token and authenticate admin
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No authentication token, access denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.tokenType && decoded.tokenType !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    if (decoded.role && !['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    // Find admin
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Admin not found' 
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

/**
 * Middleware to check admin role
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authenticated' 
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

module.exports = { auth, checkRole, authenticateToken };
