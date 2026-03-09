const mongoose = require('mongoose');
const Review = require('../models/Review');
const Dish = require('../models/Dish');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jothiramanathan2025:Raman2025@cluster0.3uapt.mongodb.net/restaurantDB?retryWrites=true&w=majority&appName=Cluster0';

async function backfillAllSnapshots() {
  try {
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all reviews that don't have snapshot fields populated
    const reviews = await Review.find({
      $or: [
        { dishName: { $exists: false } },
        { dishName: null },
        { dishName: '' }
      ]
    }).populate('dish');

    console.log(`Found ${reviews.length} reviews without snapshot fields\n`);

    let updated = 0;
    let failed = 0;

    for (const review of reviews) {
      if (review.dish) {
        // Dish reference is valid, just add the snapshot
        review.dishName = review.dish.name;
        review.dishCategory = review.dish.category;
        await review.save();
        console.log(`✅ Updated review ${review._id}: ${review.dish.name}`);
        updated++;
      } else {
        console.log(`⚠️  Review ${review._id} has no valid dish reference - cannot backfill`);
        failed++;
      }
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`   Updated: ${updated} reviews`);
    console.log(`   Failed: ${failed} reviews (no valid dish reference)`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

backfillAllSnapshots();
