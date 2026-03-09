const mongoose = require('mongoose');
const Review = require('../models/Review');

const MONGODB_URI = 'mongodb+srv://jothiramanathan2025:Raman2025@cluster0.3uapt.mongodb.net/restaurantDB?retryWrites=true&w=majority&appName=Cluster0';

async function checkReviews() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const reviews = await Review.find()
      .populate('dish')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`\nFound ${reviews.length} reviews:\n`);

    reviews.forEach((review, index) => {
      console.log(`${index + 1}. Review ID: ${review._id}`);
      console.log(`   dishName field: ${review.dishName || 'NOT SET'}`);
      console.log(`   dishCategory field: ${review.dishCategory || 'NOT SET'}`);
      console.log(`   dish populated: ${review.dish ? 'YES' : 'NO'}`);
      if (review.dish) {
        console.log(`   dish.name: ${review.dish.name}`);
        console.log(`   dish._id: ${review.dish._id}`);
      }
      console.log(`   Review text: ${review.reviewText.substring(0, 40)}...`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReviews();
