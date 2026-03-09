const axios = require('axios');
const { enhancedSentimentAnalysis } = require('./sentimentAnalysis');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const safeProbabilityMap = (label) => {
  if (label === 'positive') {
    return { positive: 0.8, neutral: 0.15, negative: 0.05 };
  }
  if (label === 'negative') {
    return { positive: 0.05, neutral: 0.15, negative: 0.8 };
  }
  return { positive: 0.2, neutral: 0.6, negative: 0.2 };
};

const callSentimentML = async (reviewText) => {
  console.log('[ML] callSentimentML started');
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/ml/sentiment`, { text: reviewText }, { timeout: 5000 });
    const data = response?.data?.data || {};

    console.log('[ML] callSentimentML success');
    return {
      label: data.label || 'neutral',
      confidence: Number(data.confidence || 0),
      probabilities: data.probabilities || safeProbabilityMap(data.label)
    };
  } catch (error) {
    console.error('[ML] callSentimentML failed, using fallback:', error.message);
    const fallback = enhancedSentimentAnalysis(reviewText, 3);

    return {
      label: fallback.label,
      confidence: Math.max(0, Math.min(1, Math.abs(fallback.comparative || 0))),
      probabilities: safeProbabilityMap(fallback.label),
      fallback
    };
  }
};

const callRecommendML = async (customerId, allDishIds, reviewedDishIds) => {
  console.log('[ML] callRecommendML started');
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/ml/recommend`,
      { customerId, allDishIds, reviewedDishIds },
      { timeout: 7000 }
    );

    console.log('[ML] callRecommendML success');
    return response?.data?.data || [];
  } catch (error) {
    console.error('[ML] callRecommendML failed:', error.message);
    return [];
  }
};

module.exports = {
  ML_SERVICE_URL,
  callSentimentML,
  callRecommendML
};
