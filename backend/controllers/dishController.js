const { validationResult } = require('express-validator');
const Dish = require('../models/Dish');

/**
 * @desc    Get all active dishes (for customers)
 * @route   GET /api/dishes/active
 * @access  Public
 */
exports.getActiveDishes = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = { isActive: true, isAvailable: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const dishes = await Dish.find(query).sort({ name: 1 });

    res.json({
      success: true,
      count: dishes.length,
      data: dishes
    });
  } catch (error) {
    console.error('Get active dishes error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Get all dishes (for admin)
 * @route   GET /api/dishes
 * @access  Private
 */
exports.getAllDishes = async (req, res) => {
  try {
    const { category, status } = req.query;
    
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const dishes = await Dish.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: dishes.length,
      data: dishes
    });
  } catch (error) {
    console.error('Get all dishes error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Get single dish
 * @route   GET /api/dishes/:id
 * @access  Public
 */
exports.getDishById = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ 
        success: false,
        message: 'Dish not found' 
      });
    }

    res.json({
      success: true,
      data: dish
    });
  } catch (error) {
    console.error('Get dish by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Create new dish
 * @route   POST /api/dishes
 * @access  Private
 */
exports.createDish = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const dishData = {
      ...req.body,
      createdBy: req.admin._id
    };

    const dish = await Dish.create(dishData);

    res.status(201).json({
      success: true,
      message: 'Dish created successfully',
      data: dish
    });
  } catch (error) {
    console.error('Create dish error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Update dish
 * @route   PUT /api/dishes/:id
 * @access  Private
 */
exports.updateDish = async (req, res) => {
  try {
    let dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ 
        success: false,
        message: 'Dish not found' 
      });
    }

    // Update fields
    const allowedUpdates = ['name', 'description', 'category', 'price', 'imageUrl', 'isAvailable', 'tags'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        dish[field] = req.body[field];
      }
    });

    dish.updatedAt = Date.now();
    await dish.save();

    res.json({
      success: true,
      message: 'Dish updated successfully',
      data: dish
    });
  } catch (error) {
    console.error('Update dish error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Delete dish
 * @route   DELETE /api/dishes/:id
 * @access  Private
 */
exports.deleteDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ 
        success: false,
        message: 'Dish not found' 
      });
    }

    await dish.deleteOne();

    res.json({
      success: true,
      message: 'Dish deleted successfully'
    });
  } catch (error) {
    console.error('Delete dish error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Toggle dish active status
 * @route   PATCH /api/dishes/:id/toggle
 * @access  Private
 */
exports.toggleDishStatus = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ 
        success: false,
        message: 'Dish not found' 
      });
    }

    dish.isActive = !dish.isActive;
    dish.updatedAt = Date.now();
    await dish.save();

    res.json({
      success: true,
      message: `Dish ${dish.isActive ? 'activated' : 'deactivated'} successfully`,
      data: dish
    });
  } catch (error) {
    console.error('Toggle dish status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};
