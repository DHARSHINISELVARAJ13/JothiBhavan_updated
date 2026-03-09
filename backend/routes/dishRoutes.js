const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const dishController = require('../controllers/dishController');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    cb(null, `${Date.now()}-${safeName}${ext ? '' : '.jpg'}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpg, jpeg, png, and webp files are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * @route   GET /api/dishes/active
 * @desc    Get all active dishes (for customers)
 * @access  Public
 */
router.get('/active', dishController.getActiveDishes);

/**
 * @route   GET /api/dishes
 * @desc    Get all dishes (for admin)
 * @access  Private
 */
router.get('/', auth, dishController.getAllDishes);

/**
 * @route   POST /api/dishes/upload
 * @desc    Upload dish image
 * @access  Private
 */
router.post('/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image uploaded'
    });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  const fullUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;

  res.json({
    success: true,
    message: 'Image uploaded successfully',
    data: { imageUrl: fullUrl }
  });
});

/**
 * @route   GET /api/dishes/:id
 * @desc    Get single dish
 * @access  Public
 */
router.get('/:id', dishController.getDishById);

/**
 * @route   POST /api/dishes
 * @desc    Create new dish
 * @access  Private
 */
router.post(
  '/',
  auth,
  [
    body('name').trim().notEmpty().withMessage('Dish name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').isIn(['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Snack', 'Special']).withMessage('Invalid category'),
    body('price').isNumeric().withMessage('Price must be a number').custom(val => val >= 0).withMessage('Price must be positive')
  ],
  dishController.createDish
);

/**
 * @route   PUT /api/dishes/:id
 * @desc    Update dish
 * @access  Private
 */
router.put('/:id', auth, dishController.updateDish);

/**
 * @route   DELETE /api/dishes/:id
 * @desc    Delete dish
 * @access  Private
 */
router.delete('/:id', auth, dishController.deleteDish);

/**
 * @route   PATCH /api/dishes/:id/toggle
 * @desc    Toggle dish active status
 * @access  Private
 */
router.patch('/:id/toggle', auth, dishController.toggleDishStatus);

module.exports = router;
