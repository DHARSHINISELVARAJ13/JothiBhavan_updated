require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Review = require('../models/Review');
require('../models/Dish');

async function backfillReviewDishSnapshot() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const reviews = await Review.find()
      .populate('dish', 'name category')
      .exec();

    let updated = 0;

    for (const review of reviews) {
      if (!review.dish) {
        continue;
      }
      const needsUpdate = !review.dishName || !review.dishCategory;
      if (!needsUpdate) {
        continue;
      }

      review.dishName = review.dish.name;
      review.dishCategory = review.dish.category;
      await review.save();
      updated++;
    }

    console.log(`✅ Backfill complete. Updated ${updated} reviews.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

backfillReviewDishSnapshot();
