const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Customer = require('../models/Customer');
const Dish = require('../models/Dish');
const Review = require('../models/Review');
const { enhancedSentimentAnalysis } = require('../utils/sentimentAnalysis');

const TEST_PASSWORD = 'mltest123';

const customerProfiles = [
  { key: 'low_1', name: 'ML Low Risk 1', email: 'ml.low1@jothibavan.com' },
  { key: 'low_2', name: 'ML Low Risk 2', email: 'ml.low2@jothibavan.com' },
  { key: 'medium_1', name: 'ML Medium Risk 1', email: 'ml.medium1@jothibavan.com' },
  { key: 'medium_2', name: 'ML Medium Risk 2', email: 'ml.medium2@jothibavan.com' },
  { key: 'high_1', name: 'ML High Risk 1', email: 'ml.high1@jothibavan.com' },
  { key: 'high_2', name: 'ML High Risk 2', email: 'ml.high2@jothibavan.com' }
];

const reviewTextByRating = {
  5: 'Excellent taste and quality. Loved this dish and will order again.',
  4: 'Very good dish, nice flavor and good presentation.',
  3: 'Average dish. Okay taste and acceptable quality.',
  2: 'Not great, slightly disappointing in taste and texture.',
  1: 'Very poor experience. Bad taste and not satisfied.'
};

const daysAgoDate = (daysAgo) => {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  value.setHours(12, 0, 0, 0);
  return value;
};

const uniqueById = (docs) => {
  const map = new Map();
  docs.forEach((doc) => map.set(String(doc._id), doc));
  return [...map.values()];
};

async function ensureCustomers() {
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  const result = {};

  for (const profile of customerProfiles) {
    let customer = await Customer.findOne({ email: profile.email });

    if (!customer) {
      customer = await Customer.create({
        name: profile.name,
        email: profile.email,
        password: hash,
        phone: `90000${Math.floor(Math.random() * 89999 + 10000)}`,
        role: 'customer',
        isActive: true,
        createdAt: new Date()
      });
      console.log(`✅ Created customer: ${profile.email}`);
    } else {
      console.log(`ℹ️ Customer already exists: ${profile.email}`);
    }

    result[profile.key] = customer;
  }

  return result;
}

async function insertReviewsForCustomer(customer, dishes, plan) {
  await Review.deleteMany({ customerId: customer._id, customerEmail: customer.email, reviewText: /\[ML_SCENARIO\]/i });

  const docs = [];

  for (const item of plan) {
    const dish = dishes[item.dishIndex % dishes.length];
    const rating = item.rating;
    const reviewText = `[ML_SCENARIO] ${reviewTextByRating[rating]} (${dish.name})`;
    const sentiment = enhancedSentimentAnalysis(reviewText, rating);
    const createdAt = daysAgoDate(item.daysAgo);

    docs.push({
      customerId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
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
  }

  if (docs.length > 0) {
    await Review.insertMany(docs);
  }
}

function buildScenarioPlans() {
  return {
    low_1: [
      { daysAgo: 55, rating: 4, dishIndex: 0 },
      { daysAgo: 32, rating: 5, dishIndex: 0 },
      { daysAgo: 18, rating: 5, dishIndex: 1 },
      { daysAgo: 6, rating: 5, dishIndex: 1 }
    ],
    low_2: [
      { daysAgo: 48, rating: 4, dishIndex: 2 },
      { daysAgo: 30, rating: 4, dishIndex: 2 },
      { daysAgo: 14, rating: 5, dishIndex: 3 },
      { daysAgo: 4, rating: 5, dishIndex: 3 }
    ],
    medium_1: [
      { daysAgo: 95, rating: 4, dishIndex: 1 },
      { daysAgo: 75, rating: 3, dishIndex: 2 },
      { daysAgo: 52, rating: 3, dishIndex: 3 },
      { daysAgo: 38, rating: 3, dishIndex: 4 }
    ],
    medium_2: [
      { daysAgo: 90, rating: 4, dishIndex: 4 },
      { daysAgo: 70, rating: 3, dishIndex: 4 },
      { daysAgo: 58, rating: 3, dishIndex: 5 },
      { daysAgo: 42, rating: 2, dishIndex: 5 }
    ],
    high_1: [
      { daysAgo: 150, rating: 3, dishIndex: 0 },
      { daysAgo: 120, rating: 2, dishIndex: 1 },
      { daysAgo: 95, rating: 2, dishIndex: 2 },
      { daysAgo: 70, rating: 1, dishIndex: 3 }
    ],
    high_2: [
      { daysAgo: 170, rating: 3, dishIndex: 2 },
      { daysAgo: 130, rating: 2, dishIndex: 3 },
      { daysAgo: 110, rating: 2, dishIndex: 4 },
      { daysAgo: 80, rating: 1, dishIndex: 5 }
    ]
  };
}

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI missing in backend/.env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const activeDishes = await Dish.find({ isActive: true, isAvailable: true }).lean();
    const dishes = uniqueById(activeDishes);
    if (dishes.length < 6) {
      throw new Error('At least 6 active dishes required to generate ML scenarios');
    }

    const customers = await ensureCustomers();
    const scenarioPlans = buildScenarioPlans();

    for (const [key, customer] of Object.entries(customers)) {
      await insertReviewsForCustomer(customer, dishes, scenarioPlans[key] || []);
      console.log(`✅ Seeded ML scenario reviews for ${customer.email}`);
    }

    console.log('\n🎯 Recommendation scenario seed complete');
    console.log('Generated multiple customer preference patterns for recommendation testing');
    console.log(`Test password: ${TEST_PASSWORD}`);
  } catch (error) {
    console.error('❌ ML scenario seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB closed');
  }
}

run();
