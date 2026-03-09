const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const Dish = require('../models/Dish');
const Review = require('../models/Review');
const Settings = require('../models/Settings');
const { enhancedSentimentAnalysis } = require('../utils/sentimentAnalysis');

const ADMIN_EMAIL = 'admin@jothibavan.com';
const ADMIN_PASSWORD = 'admin123';
const CUSTOMER_PASSWORD = 'demo1234';

const customersSeed = [
  { name: 'Arun Kumar', email: 'demo.customer1@jothibavan.com', phone: '9000000001' },
  { name: 'Divya R', email: 'demo.customer2@jothibavan.com', phone: '9000000002' },
  { name: 'Karthik S', email: 'demo.customer3@jothibavan.com', phone: '9000000003' },
  { name: 'Meena V', email: 'demo.customer4@jothibavan.com', phone: '9000000004' },
  { name: 'Prakash M', email: 'demo.customer5@jothibavan.com', phone: '9000000005' },
  { name: 'Sangeetha P', email: 'demo.customer6@jothibavan.com', phone: '9000000006' },
  { name: 'Vignesh T', email: 'demo.customer7@jothibavan.com', phone: '9000000007' },
  { name: 'Yamini A', email: 'demo.customer8@jothibavan.com', phone: '9000000008' }
];

const dishSeed = [
  {
    name: 'Masala Dosa',
    description: 'Crispy rice crepe filled with spiced potato filling, served with sambhar and chutneys',
    category: 'Main Course',
    price: 80,
    tags: ['vegetarian', 'south-indian', 'breakfast']
  },
  {
    name: 'Idli Sambhar',
    description: 'Steamed rice cakes served with flavorful lentil soup and coconut chutney',
    category: 'Main Course',
    price: 50,
    tags: ['vegetarian', 'south-indian', 'healthy', 'breakfast']
  },
  {
    name: 'Paneer Butter Masala',
    description: 'Cottage cheese cubes cooked in rich tomato and butter gravy',
    category: 'Main Course',
    price: 180,
    tags: ['vegetarian', 'north-indian', 'curry']
  },
  {
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice cooked with tender chicken pieces and traditional spices',
    category: 'Main Course',
    price: 220,
    tags: ['non-vegetarian', 'rice', 'biryani']
  },
  {
    name: 'Vada',
    description: 'Crispy lentil fritters served with chutneys',
    category: 'Appetizer',
    price: 40,
    tags: ['vegetarian', 'south-indian', 'fried']
  },
  {
    name: 'Filter Coffee',
    description: 'Traditional South Indian filter coffee made with fresh milk and coffee decoction',
    category: 'Beverage',
    price: 30,
    tags: ['beverage', 'coffee', 'hot']
  },
  {
    name: 'Gulab Jamun',
    description: 'Soft milk-solid balls soaked in rose-flavored sugar syrup',
    category: 'Dessert',
    price: 60,
    tags: ['vegetarian', 'sweet', 'dessert']
  },
  {
    name: 'Pongal',
    description: 'Comfort rice and lentil dish tempered with black pepper and ghee',
    category: 'Main Course',
    price: 70,
    tags: ['vegetarian', 'south-indian', 'comfort-food']
  },
  {
    name: 'Curd Rice',
    description: 'Cooling rice mixed with fresh yogurt and tempered with mustard seeds',
    category: 'Main Course',
    price: 60,
    tags: ['vegetarian', 'south-indian', 'cooling']
  },
  {
    name: 'Samosa',
    description: 'Crispy pastry filled with spiced potato and peas',
    category: 'Snack',
    price: 35,
    tags: ['vegetarian', 'snack', 'fried']
  }
];

const ratingTexts = {
  5: 'Outstanding taste, excellent quality, and perfectly cooked. Loved every bite.',
  4: 'Very tasty and satisfying dish. Good quality and I would order again.',
  3: 'Average experience. The dish was okay but not very memorable.',
  2: 'Below average quality and flavor. Could be improved a lot.',
  1: 'Very disappointing taste and poor overall experience.'
};

const reviewMatrix = [
  // c1, c2, c3, c4, c5, c6, c7, c8
  [5, 5, 4, 4, 2, 2, 3, 4], // Masala Dosa
  [5, 4, 4, 5, 2, 3, 3, 4], // Idli Sambhar
  [4, 5, 5, 4, 2, 2, 3, 5], // Paneer Butter Masala
  [2, 3, 2, 2, 5, 5, 4, 3], // Chicken Biryani
  [3, 4, 3, 3, 5, 4, 4, 3], // Vada
  [4, 4, 5, 4, 2, 2, 3, 4], // Filter Coffee
  [3, 3, 4, 4, 5, 5, 4, 3], // Gulab Jamun
  [5, 4, 4, 5, 2, 3, 3, 4], // Pongal
  [4, 4, 3, 4, 2, 2, 3, 4], // Curd Rice
  [3, 4, 3, 3, 4, 4, 5, 3]  // Samosa
];

const dayOffsets = [120, 108, 96, 84, 72, 60, 48, 36, 24, 12];

function toPastDate(daysAgo, hourShift = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(10 + hourShift, 0, 0, 0);
  return d;
}

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI missing in backend/.env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Clearing old data for deterministic demo state...');
    await Promise.all([
      Review.deleteMany({}),
      Customer.deleteMany({}),
      Dish.deleteMany({}),
      Admin.deleteMany({}),
      Settings.deleteMany({})
    ]);

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await Admin.create({
      name: 'Admin User',
      email: ADMIN_EMAIL,
      password: adminHash,
      role: 'super_admin',
      isActive: true
    });

    const dishes = await Dish.insertMany(
      dishSeed.map((dish) => ({
        ...dish,
        isActive: true,
        isAvailable: true,
        createdBy: admin._id
      }))
    );

    await Settings.create({
      hotelName: 'Jothi Bavan',
      description: 'Welcome to Jothi Bavan - Where tradition meets taste. Experience authentic South Indian cuisine prepared with love and served with care.',
      tagline: 'Authentic flavors, memorable experiences',
      features: [
        { title: 'Fresh Ingredients', description: 'We use fresh ingredients sourced daily.', icon: 'Fresh' },
        { title: 'Authentic Recipes', description: 'Traditional recipes from experienced chefs.', icon: 'Chef' },
        { title: 'Hygienic Environment', description: 'Clean and safe kitchen and dining standards.', icon: 'Clean' },
        { title: 'Quick Service', description: 'Efficient service without compromising quality.', icon: 'Fast' }
      ],
      contactInfo: {
        phone: '94896 10555',
        email: 'info@jothibavan.com',
        address: '331, Bhavani Main Road, Near RTO Office',
        city: 'Perundurai',
        state: 'Tamil Nadu',
        pincode: '638 052'
      }
    });

    const customerHash = await bcrypt.hash(CUSTOMER_PASSWORD, 10);
    const customers = await Customer.insertMany(
      customersSeed.map((customer, i) => ({
        ...customer,
        password: customerHash,
        role: 'customer',
        isActive: true,
        createdAt: toPastDate(140 - i * 5)
      }))
    );

    const reviewsToInsert = [];

    dishes.forEach((dish, dishIdx) => {
      customers.forEach((customer, customerIdx) => {
        // Leave some gaps so recommendations can suggest unseen dishes.
        const shouldSkip = (dishIdx + customerIdx) % 7 === 0;
        if (shouldSkip) {
          return;
        }

        const rating = reviewMatrix[dishIdx][customerIdx];
        const baseText = ratingTexts[rating];
        const reviewText = `[DEMO] ${baseText} Dish: ${dish.name}.`;
        const sentiment = enhancedSentimentAnalysis(reviewText, rating);
        const createdAt = toPastDate(dayOffsets[dishIdx], customerIdx % 3);

        reviewsToInsert.push({
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          dish: dish._id,
          dishName: dish.name,
          dishCategory: dish.category,
          rating,
          reviewText,
          sentiment: {
            score: sentiment.score,
            comparative: sentiment.comparative,
            label: sentiment.label,
            tokens: sentiment.tokens,
            positive: sentiment.positive,
            negative: sentiment.negative
          },
          isVisible: true,
          createdAt,
          updatedAt: createdAt
        });
      });
    });

    await Review.insertMany(reviewsToInsert);

    console.log('\n🎉 Demo seed complete');
    console.log(`👤 Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`👥 Customer login password: ${CUSTOMER_PASSWORD}`);
    console.log('👥 Customer emails:');
    customersSeed.forEach((c) => console.log(`   - ${c.email}`));
    console.log(`🍽️ Dishes seeded: ${dishes.length}`);
    console.log(`📝 Reviews seeded: ${reviewsToInsert.length}`);
    console.log('✅ Data includes varied ratings/text for sentiment and collaborative overlap for recommendations.');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

run();