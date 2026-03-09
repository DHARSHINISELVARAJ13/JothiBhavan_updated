require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Dish = require('../models/Dish');

async function relinkReviewsByDishName() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const dishes = await Dish.find().lean();
    const dishMap = dishes.map(d => ({
      _id: d._id,
      name: d.name,
      category: d.category,
      nameLower: d.name.toLowerCase()
    }));

    const reviews = await Review.find().lean();
    let updated = 0;

    for (const review of reviews) {
      const text = (review.reviewText || '').toLowerCase();
      const matched = dishMap.find(d => text.includes(d.nameLower));
      if (!matched) {
        continue;
      }

      await Review.updateOne(
        { _id: review._id },
        {
          $set: {
            dish: matched._id,
            dishName: matched.name,
            dishCategory: matched.category
          }
        }
      );
      updated++;
    }

    console.log(`✅ Relink complete. Updated ${updated} reviews.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

relinkReviewsByDishName();
