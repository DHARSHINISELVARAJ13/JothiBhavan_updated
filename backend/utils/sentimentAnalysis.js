const Sentiment = require('sentiment');

const sentiment = new Sentiment();
const neutralHintRegex = /\b(ok|okay|fine|average|decent|alright|so\s*so|not\s*bad|nothing\s*special|just\s*okay|just\s*fine)\b/i;

/**
 * Analyze sentiment of text
 * @param {string} text - Text to analyze
 * @returns {Object} Sentiment analysis result
 */
const analyzeSentiment = (text) => {
  try {
    const result = sentiment.analyze(text);
    
    
    let label = 'neutral';
    if (result.score > 1) {
      label = 'positive';
    } else if (result.score < -1) {
      label = 'negative';
    }

    return {
      score: result.score,
      comparative: result.comparative,
      label: label,
      tokens: result.tokens,
      positive: result.positive,
      negative: result.negative
    };
  } catch (error) {
    console.error('Sentiment analysis error:', error);
   
    return {
      score: 0,
      comparative: 0,
      label: 'neutral',
      tokens: [],
      positive: [],
      negative: []
    };
  }
};


const hasNegation = (text) => {
  const negationWords = ['not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'hardly', 'barely', 'scarcely'];
  const lowerText = text.toLowerCase();
  return negationWords.some(word => lowerText.includes(word));
};

const enhancedSentimentAnalysis = (text, rating) => {
  let textSentiment = analyzeSentiment(text);
  
 
  if (hasNegation(text) && textSentiment.score > 0) {
    textSentiment.score = -Math.abs(textSentiment.score);
  }
  
 
  const ratingScore = (rating - 3) * 2; // Convert 1-5 scale to -4 to 4
  const enhancedScore = (textSentiment.score * 0.4) + (ratingScore * 0.6);
  
 
  let finalLabel = 'neutral';
  if (enhancedScore > 0.3) {
    finalLabel = 'positive';
  } else if (enhancedScore < -0.3) {
    finalLabel = 'negative';
  }
  
  return {
    ...textSentiment,
    score: enhancedScore,
    label: finalLabel,
    rating: rating
  };
};

const resolveSentimentWithRating = ({ reviewText, rating, fallbackSentiment, mlSentiment, mlMeta }) => {
  if (!mlSentiment || !mlSentiment.label) {
    return fallbackSentiment;
  }

  const safeRating = Number(rating);
  const fallback = fallbackSentiment || enhancedSentimentAnalysis(reviewText, safeRating || 3);
  const probabilities = mlMeta?.probabilities || {};
  const positiveProbability = Number(probabilities.positive || 0);
  const negativeProbability = Number(probabilities.negative || 0);
  const confidence = Number(mlMeta?.confidence || 0);
  const probabilityGap = Math.abs(positiveProbability - negativeProbability);

  if (safeRating === 3) {
    const hasNeutralHint = neutralHintRegex.test(String(reviewText || ''));
    const weakMlSignal = confidence < 0.7 || probabilityGap < 0.35;
    if (hasNeutralHint || fallback.label === 'neutral' || weakMlSignal) {
      return {
        ...fallback,
        label: 'neutral'
      };
    }
  }

  if ((safeRating <= 2 && mlSentiment.label === 'positive') || (safeRating >= 4 && mlSentiment.label === 'negative')) {
    return fallback;
  }

  return mlSentiment;
};

module.exports = { analyzeSentiment, enhancedSentimentAnalysis, resolveSentimentWithRating };
