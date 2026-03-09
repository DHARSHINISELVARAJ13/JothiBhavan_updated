const mongoose = require('mongoose');

// Direct MongoDB connection
const MONGO_URI = 'mongodb+srv://jothi:jothi2005@cluster0.fzopt.mongodb.net/DishDash';

async function fixReviews() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    const Review = mongoose.model('Review');
    const Dish = mongoose.model('Dish');

    // Get all reviews
    const reviews = await Review.find({});
    console.log(`Total reviews: ${reviews.length}\n`);

    // Get all dishes
    const dishes = await Dish.find({});
    console.log(`Available dishes: ${dishes.map(d => d.name).join(', ')}\n`);

    let fixedCount = 0;

    for (const review of reviews) {
      // Check if dish exists
      const dishExists = dishes.find(d => d._id.toString() === review.dishId.toString());
      
      if (!dishExists) {
        console.log(`❌ Orphaned review: "${review.reviewText}"`);
        console.log(`   Current dishName: ${review.dishName || 'null'}`);
        
        // Try to match with available dishes by checking review text
        let matchedDish = null;
        const reviewLower = review.reviewText.toLowerCase();
        
        for (const dish of dishes) {
          const dishLower = dish.name.toLowerCase();
          const keywords = dishLower.split(' ').filter(w => w.length > 3);
          
          if (keywords.some(kw => reviewLower.includes(kw)) || reviewLower.includes(dishLower)) {
            matchedDish = dish;
            break;
          }
        }
        
        if (matchedDish) {
          // Update with correct dish
          await Review.updateOne(
            { _id: review._id },
            { 
              dishId: matchedDish._id,
              dishName: matchedDish.name,
              dishCategory: matchedDish.category 
            }
          );
          console.log(`   ✅ Fixed: Linked to "${matchedDish.name}"\n`);
          fixedCount++;
        } else {
          // Extract capitalized words as potential dish name
          const capitalizedWords = review.reviewText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
          const inferredName = capitalizedWords && capitalizedWords.length > 0 
            ? capitalizedWords[0] 
            : review.reviewText.split(' ').slice(0, 3).join(' ');
          
          await Review.updateOne(
            { _id: review._id },
            { dishName: inferredName }
          );
          console.log(`   ⚠️  Set as: "${inferredName}"\n`);
          fixedCount++;
        }
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} reviews`);
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixReviews();
