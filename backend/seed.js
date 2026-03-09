const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const Admin = require('./models/Admin');
const Dish = require('./models/Dish');
const Settings = require('./models/Settings');

// Load environment variables from parent directory
require("dotenv").config({ path: path.resolve(__dirname, '.env') });

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out in production)
    console.log('🗑️  Clearing existing data...');
    await Admin.deleteMany({});
    await Dish.deleteMany({});
    await Settings.deleteMany({});

    // Create admin user
    console.log('👤 Creating admin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await Admin.create({
      name: 'Admin User',
      email: 'admin@jothibavan.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true
    });

    console.log('✅ Admin created:', admin.email);

    // Create sample dishes
    console.log('🍽️  Creating sample dishes...');
    const dishes = [
      {
        name: 'Masala Dosa',
        description: 'Crispy rice crepe filled with spiced potato filling, served with sambhar and chutneys',
        category: 'Main Course',
        price: 80,
        tags: ['vegetarian', 'south-indian', 'breakfast'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Idli Sambhar',
        description: 'Steamed rice cakes served with flavorful lentil soup and coconut chutney',
        category: 'Main Course',
        price: 50,
        tags: ['vegetarian', 'south-indian', 'healthy', 'breakfast'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Paneer Butter Masala',
        description: 'Cottage cheese cubes cooked in rich tomato and butter gravy',
        category: 'Main Course',
        price: 180,
        tags: ['vegetarian', 'north-indian', 'curry'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Chicken Biryani',
        description: 'Aromatic basmati rice cooked with tender chicken pieces and traditional spices',
        category: 'Main Course',
        price: 220,
        tags: ['non-vegetarian', 'rice', 'biryani'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Vada',
        description: 'Crispy lentil fritters served with chutneys',
        category: 'Appetizer',
        price: 40,
        tags: ['vegetarian', 'south-indian', 'fried'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Filter Coffee',
        description: 'Traditional South Indian filter coffee made with fresh milk and coffee decoction',
        category: 'Beverage',
        price: 30,
        tags: ['beverage', 'coffee', 'hot'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Gulab Jamun',
        description: 'Soft milk-solid balls soaked in rose-flavored sugar syrup',
        category: 'Dessert',
        price: 60,
        tags: ['vegetarian', 'sweet', 'dessert'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Pongal',
        description: 'Comfort rice and lentil dish tempered with black pepper and ghee',
        category: 'Main Course',
        price: 70,
        tags: ['vegetarian', 'south-indian', 'comfort-food'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Curd Rice',
        description: 'Cooling rice mixed with fresh yogurt and tempered with mustard seeds',
        category: 'Main Course',
        price: 60,
        tags: ['vegetarian', 'south-indian', 'cooling'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      },
      {
        name: 'Samosa',
        description: 'Crispy pastry filled with spiced potato and peas',
        category: 'Snack',
        price: 35,
        tags: ['vegetarian', 'snack', 'fried'],
        createdBy: admin._id,
        isActive: true,
        isAvailable: true
      }
    ];

    const createdDishes = await Dish.insertMany(dishes);
    console.log(`✅ Created ${createdDishes.length} dishes`);

    // Create site settings
    console.log('⚙️  Creating site settings...');
    await Settings.create({
      hotelName: 'Jothi Bavan',
      description: 'Welcome to Jothi Bavan - Where tradition meets taste. Experience authentic South Indian cuisine prepared with love and served with care.',
      tagline: 'Authentic flavors, memorable experiences',
      features: [
        {
          title: 'Fresh Ingredients',
          description: 'We use only the freshest ingredients sourced daily from local markets',
          icon: '🌿'
        },
        {
          title: 'Authentic Recipes',
          description: 'Traditional recipes passed down through generations of expert chefs',
          icon: '👨‍🍳'
        },
        {
          title: 'Hygienic Environment',
          description: 'Clean and sanitized dining areas maintained to the highest standards',
          icon: '✨'
        },
        {
          title: 'Quick Service',
          description: 'Fast and efficient service without compromising on quality',
          icon: '⚡'
        }
      ],
      contactInfo: {
        phone: '+91 1234567890',
        email: 'info@jothibavan.com',
        address: '123 Main Street, Gandhi Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001'
      },
      socialMedia: {
        facebook: 'https://facebook.com/jothibavan',
        instagram: 'https://instagram.com/jothibavan',
        twitter: 'https://twitter.com/jothibavan'
      },
      businessHours: {
        monday: { open: '07:00 AM', close: '10:00 PM' },
        tuesday: { open: '07:00 AM', close: '10:00 PM' },
        wednesday: { open: '07:00 AM', close: '10:00 PM' },
        thursday: { open: '07:00 AM', close: '10:00 PM' },
        friday: { open: '07:00 AM', close: '10:00 PM' },
        saturday: { open: '07:00 AM', close: '10:00 PM' },
        sunday: { open: '07:00 AM', close: '10:00 PM' }
      }
    });

    console.log('✅ Site settings created');

    console.log('\n✨ Database seeded successfully!\n');
    console.log('📧 Admin Email: admin@jothibavan.com');
    console.log('🔑 Admin Password: admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
