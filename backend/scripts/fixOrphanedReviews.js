require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Dish = require('../models/Dish');

async function fixOrphanedReviews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all reviews and dishes
    const reviews = await Review.find({});
    const dishes = await Dish.find({});

    console.log(`\n📊 Total Reviews: ${reviews.length}`);
    console.log(`📊 Total Dishes: ${dishes.length}\n`);

    // Find orphaned reviews
    const orphanedReviews = [];
    for (const review of reviews) {
      const dishExists = await Dish.findById(review.dishId);
      if (!dishExists) {
        orphanedReviews.push(review);
      }
    }

    console.log(`🔍 Found ${orphanedReviews.length} orphaned reviews\n`);

    if (orphanedReviews.length === 0) {
      console.log('✅ All reviews are properly linked!');
      await mongoose.connection.close();
      return;
    }

    // Display orphaned reviews with their text
    console.log('=== ORPHANED REVIEWS ===\n');
    orphanedReviews.forEach((review, index) => {
      console.log(`${index + 1}. Review ID: ${review._id}`);
      console.log(`   Rating: ${review.rating} stars`);
      console.log(`   Text: "${review.reviewText}"`);
      console.log(`   Current dishName: ${review.dishName || 'null'}`);
      console.log(`   Broken dishId: ${review.dishId}`);
      console.log('');
    });

    console.log('\n=== AVAILABLE DISHES ===\n');
    dishes.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name} (${dish.category}) - ID: ${dish._id}`);
    });

    // Try to match orphaned reviews to dishes
    let updatedCount = 0;
    console.log('\n=== ATTEMPTING TO FIX ===\n');

    for (const review of orphanedReviews) {
      let matchedDish = null;
      const reviewTextLower = review.reviewText.toLowerCase();

      // Try to find dish name in review text
      for (const dish of dishes) {
        const dishNameLower = dish.name.toLowerCase();
        const dishWords = dishNameLower.split(' ');
        
        // Check if any significant word from dish name appears in review
        const hasMatch = dishWords.some(word => 
          word.length > 3 && reviewTextLower.includes(word.toLowerCase())
        );

        if (hasMatch || reviewTextLower.includes(dishNameLower)) {
          matchedDish = dish;
          break;
        }
      }

      if (matchedDish) {
        // Update the review with correct dish reference and snapshot
        await Review.findByIdAndUpdate(review._id, {
          dishId: matchedDish._id,
          dishName: matchedDish.name,
          dishCategory: matchedDish.category
        });
        console.log(`✅ Fixed: "${review.reviewText.substring(0, 50)}..." -> ${matchedDish.name}`);
        updatedCount++;
      } else {
        // If no match found, at least populate dishName as "Unknown Dish"
        // so it shows something meaningful instead of "Deleted Dish"
        const possibleDishName = extractDishNameFromReview(review.reviewText);
        await Review.findByIdAndUpdate(review._id, {
          dishName: possibleDishName || 'Unknown Dish'
        });
        console.log(`⚠️  No match found: "${review.reviewText.substring(0, 50)}..." -> Set as "${possibleDishName || 'Unknown Dish'}"`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Fixed ${updatedCount} orphaned reviews`);
    await mongoose.connection.close();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Helper function to extract potential dish name from review text
function extractDishNameFromReview(reviewText) {
  // Common dish-related patterns
  const patterns = [
    /the ([A-Z][a-z]+(?: [A-Z][a-z]+)*) (?:is|was|tastes)/i,
    /([A-Z][a-z]+(?: [A-Z][a-z]+)*) (?:is|was) (?:good|great|excellent|amazing|delicious|tasty|bad|terrible|awful)/i,
    /loved? the ([A-Z][a-z]+(?: [A-Z][a-z]+)*)/i,
    /tried the ([A-Z][a-z]+(?: [A-Z][a-z]+)*)/i
  ];

  for (const pattern of patterns) {
    const match = reviewText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

fixOrphanedReviews();
