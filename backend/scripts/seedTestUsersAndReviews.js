const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Customer = require('../models/Customer');
const Dish = require('../models/Dish');
const Review = require('../models/Review');
const { enhancedSentimentAnalysis } = require('../utils/sentimentAnalysis');

const TEST_PASSWORD = 'test1234';

const customerSeeds = [
  { name: 'Arun Kumar', email: 'test.customer1@jothibavan.com', phone: '9000000001' },
  { name: 'Divya R', email: 'test.customer2@jothibavan.com', phone: '9000000002' },
  { name: 'Karthik S', email: 'test.customer3@jothibavan.com', phone: '9000000003' },
  { name: 'Meena V', email: 'test.customer4@jothibavan.com', phone: '9000000004' },
  { name: 'Prakash M', email: 'test.customer5@jothibavan.com', phone: '6374437153' },
  { name: 'Sangeetha P', email: 'test.customer6@jothibavan.com', phone: '9000000006' },
  { name: 'Vignesh T', email: 'test.customer7@jothibavan.com', phone: '9000000007' },
  { name: 'Yamini A', email: 'test.customer8@jothibavan.com', phone: '9000000008' }
];

const reviewTemplates = [
  { rating: 5, text: 'Excellent taste and super fresh. I loved this dish and will order again.' },
  { rating: 4, text: 'Very good flavor and nice portion size. Service was quick too.' },
  { rating: 3, text: 'It was okay, average taste and decent quality overall.' },
  { rating: 2, text: 'Not great, taste felt bland and the texture was not good.' },
  { rating: 1, text: 'Very disappointing dish. Bad taste and poor experience today.' }
];

const pickTemplate = (index) => reviewTemplates[index % reviewTemplates.length];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildReviewDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(8, 22), randomInt(0, 59), randomInt(0, 59), 0);
  return date;
};

async function ensureCustomers() {
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  const customers = [];

  for (const seed of customerSeeds) {
    let customer = await Customer.findOne({ email: seed.email });

    if (!customer) {
      customer = await Customer.create({
        name: seed.name,
        email: seed.email,
        password: hashedPassword,
        phone: seed.phone,
        role: 'customer',
        isActive: true,
        createdAt: new Date()
      });
      console.log(`✅ Created customer: ${seed.email}`);
    } else {
      console.log(`ℹ️ Customer exists: ${seed.email}`);
    }

    customers.push(customer);
  }

  return customers;
}

async function seedReviews(customers, dishes) {
  if (!dishes.length) {
    throw new Error('No active dishes found. Please add dishes before running this script.');
  }

  let insertedCount = 0;

  for (let customerIndex = 0; customerIndex < customers.length; customerIndex += 1) {
    const customer = customers[customerIndex];

    const existingCount = await Review.countDocuments({ customerId: customer._id });
    if (existingCount >= 8) {
      console.log(`ℹ️ Skipping ${customer.email}, already has ${existingCount} reviews`);
      continue;
    }

    const reviewsToCreate = randomInt(8, 14);

    for (let reviewIndex = 0; reviewIndex < reviewsToCreate; reviewIndex += 1) {
      const dish = dishes[(customerIndex + reviewIndex) % dishes.length];
      const template = pickTemplate(customerIndex + reviewIndex);
      const daysAgo = randomInt(2, 140);
      const createdAt = buildReviewDate(daysAgo);

      const personalizedText = `${template.text} (${dish.name})`;
      const sentiment = enhancedSentimentAnalysis(personalizedText, template.rating);

      await Review.create({
        customerId: customer._id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        dish: dish._id,
        dishName: dish.name,
        dishCategory: dish.category,
        rating: template.rating,
        reviewText: personalizedText,
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

      insertedCount += 1;
    }

    console.log(`✅ Added test reviews for ${customer.email}`);
  }

  return insertedCount;
}

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing in backend/.env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const dishes = await Dish.find({ isActive: true, isAvailable: true }).limit(50);
    console.log(`ℹ️ Active dishes available: ${dishes.length}`);

    const customers = await ensureCustomers();
    const insertedCount = await seedReviews(customers, dishes);

    console.log('\n🎉 Test dataset generation complete');
    console.log(`👤 Test customers ensured: ${customers.length}`);
    console.log(`📝 New reviews inserted: ${insertedCount}`);
    console.log(`🔐 Common password for test customers: ${TEST_PASSWORD}`);
  } catch (error) {
    console.error('❌ Failed to seed test users and reviews:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

run();
