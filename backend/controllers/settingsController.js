const Settings = require('../models/Settings');

/**
 * @desc    Get site settings
 * @route   GET /api/settings
 * @access  Public
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSiteSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Update site settings
 * @route   PUT /api/settings
 * @access  Private
 */
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({
        ...req.body,
        updatedBy: req.admin._id
      });
    } else {
      // Update fields
      const allowedUpdates = [
        'hotelName', 'description', 'tagline', 'features',
        'contactInfo', 'socialMedia', 'businessHours',
        'logoUrl', 'bannerImages'
      ];

      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          settings[field] = req.body[field];
        }
      });

      settings.updatedAt = Date.now();
      settings.updatedBy = req.admin._id;
      await settings.save();
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};
