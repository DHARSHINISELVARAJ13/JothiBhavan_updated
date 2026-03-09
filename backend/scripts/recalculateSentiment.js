const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}
const mongoose = require('mongoose');
const Review = require('../models/Review');
const { enhancedSentimentAnalysis } = require('../utils/sentimentAnalysis');

async function recalculateSentiment() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected! Fetching all reviews...');
    const reviews = await Review.find();
    console.log(`Found ${reviews.length} reviews to process`);

    let updated = 0;
    let failed = 0;

    for (const review of reviews) {
      try {
        // Recalculate sentiment with improved algorithm
        const sentiment = enhancedSentimentAnalysis(review.reviewText, review.rating);
        
        // Update review with new sentiment analysis
        review.sentiment = {
          score: sentiment.score,
          comparative: sentiment.comparative,
          label: sentiment.label,
          tokens: sentiment.tokens,
          positive: sentiment.positive,
          negative: sentiment.negative
        };

        await review.save();
        updated++;

        if (updated % 10 === 0) {
          console.log(`Processed ${updated}/${reviews.length} reviews...`);
        }
      } catch (error) {
        console.error(`Error updating review ${review._id}:`, error.message);
        failed++;
      }
    }

    console.log('\n✅ Sentiment recalculation complete!');
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${updated + failed}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recalculateSentiment();
