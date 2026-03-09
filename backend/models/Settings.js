const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  hotelName: {
    type: String,
    required: true,
    default: 'Jothi Bavan'
  },
  description: {
    type: String,
    required: true,
    default: 'Welcome to Jothi Bavan - Where tradition meets taste'
  },
  tagline: {
    type: String,
    default: 'Authentic flavors, memorable experiences'
  },
  features: [{
    title: String,
    description: String,
    icon: String
  }],
  contactInfo: {
    phone: String,
    email: String,
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String
  },
  businessHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  logoUrl: {
    type: String,
    default: ''
  },
  bannerImages: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

// Only allow one settings document
settingsSchema.statics.getSiteSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      hotelName: 'Jothi Bavan',
      description: 'Welcome to Jothi Bavan - Where tradition meets taste. Experience authentic South Indian cuisine prepared with love and served with care.',
      tagline: 'Authentic flavors, memorable experiences',
      features: [
        {
          title: 'Fresh Ingredients',
          description: 'We use only the freshest ingredients sourced daily',
          icon: '🌿'
        },
        {
          title: 'Authentic Recipes',
          description: 'Traditional recipes passed down through generations',
          icon: '👨‍🍳'
        },
        {
          title: 'Hygienic Environment',
          description: 'Clean and sanitized dining areas for your safety',
          icon: '✨'
        },
        {
          title: 'Quick Service',
          description: 'Fast and efficient service without compromising quality',
          icon: '⚡'
        }
      ],
      contactInfo: {
        phone: '+91 9655834210',
        email: 'info@jothibavan.com',
        address: 'Gandhi Nagar,Thoppupalayam',
        city: 'Perundurai',
        state: 'Tamil Nadu',
        pincode: '638060'
      }
    });
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
