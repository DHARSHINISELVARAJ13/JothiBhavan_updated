const Review = require('../models/Review');
const Dish = require('../models/Dish');

/**
 * @desc    Get dashboard analytics
 * @route   GET /api/admin/dashboard
 * @access  Private
 */
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { timeRange = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

    // Total reviews in selected time range
    const totalReviewsInRange = await Review.countDocuments({ 
      createdAt: { $gte: daysAgo } 
    });

    // All-time total reviews (for DB-aligned summary)
    const totalReviews = await Review.countDocuments({});

    // Sentiment breakdown
    const sentimentStats = await Review.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: '$sentiment.label',
          count: { $sum: 1 }
        }
      }
    ]);

    const sentimentBreakdown = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    sentimentStats.forEach(stat => {
      sentimentBreakdown[stat._id] = stat.count;
    });

    const sentimentPercentages = {
      positive: totalReviewsInRange > 0 ? ((sentimentBreakdown.positive / totalReviewsInRange) * 100).toFixed(1) : 0,
      neutral: totalReviewsInRange > 0 ? ((sentimentBreakdown.neutral / totalReviewsInRange) * 100).toFixed(1) : 0,
      negative: totalReviewsInRange > 0 ? ((sentimentBreakdown.negative / totalReviewsInRange) * 100).toFixed(1) : 0
    };

    // Top dish contributors per sentiment for hover drill-down in pie chart.
    const sentimentDishContributorsAgg = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo },
          dish: { $ne: null },
          'sentiment.label': { $in: ['positive', 'neutral', 'negative'] }
        }
      },
      {
        $group: {
          _id: {
            sentiment: '$sentiment.label',
            dish: '$dish'
          },
          reviewCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'dishes',
          localField: '_id.dish',
          foreignField: '_id',
          as: 'dishData'
        }
      },
      {
        $unwind: {
          path: '$dishData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          sentiment: '$_id.sentiment',
          dishId: '$_id.dish',
          reviewCount: 1,
          dishName: { $ifNull: ['$dishData.name', 'Unknown Dish'] }
        }
      },
      { $sort: { sentiment: 1, reviewCount: -1, dishName: 1 } }
    ]);

    const sentimentDishContributors = {
      positive: [],
      neutral: [],
      negative: []
    };

    const dishReviewTotalsByName = {};

    const normalizeDishName = (name = '') => String(name || 'Unknown Dish').trim().toLowerCase();

    sentimentDishContributorsAgg.forEach((item) => {
      const dishNameKey = normalizeDishName(item.dishName);
      dishReviewTotalsByName[dishNameKey] = (dishReviewTotalsByName[dishNameKey] || 0) + item.reviewCount;
    });

    sentimentDishContributorsAgg.forEach((item) => {
      if (!sentimentDishContributors[item.sentiment]) {
        return;
      }

      const sentimentTotal = sentimentBreakdown[item.sentiment] || 0;
      const totalDishReviews = dishReviewTotalsByName[normalizeDishName(item.dishName)] || item.reviewCount;
      const percentageOfSentiment = sentimentTotal > 0
        ? Number(((item.reviewCount / sentimentTotal) * 100).toFixed(1))
        : 0;
      const percentageOfDish = totalDishReviews > 0
        ? Number(((item.reviewCount / totalDishReviews) * 100).toFixed(1))
        : 0;

      sentimentDishContributors[item.sentiment].push({
        dishId: item.dishId,
        dishName: item.dishName,
        reviewCount: item.reviewCount,
        totalDishReviews,
        percentageOfSentiment,
        percentageOfDish
      });
    });

    Object.keys(sentimentDishContributors).forEach((sentimentKey) => {
      sentimentDishContributors[sentimentKey] = sentimentDishContributors[sentimentKey].slice(0, 5);
    });

    // Average rating
    const avgRatingResult = await Review.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const averageRating = avgRatingResult.length > 0 
      ? avgRatingResult[0].avgRating.toFixed(1) 
      : 0;

    // Top rated dishes (by average rating and review count) - exclude deleted dishes
    const topRatedDishes = await Review.aggregate([
      { $match: { createdAt: { $gte: daysAgo }, dish: { $ne: null } } },
      {
        $group: {
          _id: '$dish',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
          positiveCount: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] }
          }
        }
      },
      { $match: { reviewCount: { $gte: 3 } } }, // At least 3 reviews
      { $sort: { avgRating: -1, reviewCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'dishes',
          localField: '_id',
          foreignField: '_id',
          as: 'dishData'
        }
      },
      {
        $unwind: '$dishData'
      }
    ]);

    const formattedTopDishes = topRatedDishes.map(item => ({
      dish: {
        _id: item.dishData._id,
        name: item.dishData.name,
        category: item.dishData.category,
        price: item.dishData.price
      },
      avgRating: item.avgRating.toFixed(1),
      reviewCount: item.reviewCount,
      positivePercentage: ((item.positiveCount / item.reviewCount) * 100).toFixed(1)
    }));

    // Needs improvement dishes: rank by negative percentage, not only raw count.
    const negativeReviews = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo },
          dish: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$dish',
          reviewCount: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          negativeCount: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          negativePercentage: {
            $cond: [
              { $gt: ['$reviewCount', 0] },
              { $multiply: [{ $divide: ['$negativeCount', '$reviewCount'] }, 100] },
              0
            ]
          }
        }
      },
      { $match: { reviewCount: { $gte: 3 }, negativeCount: { $gte: 1 } } },
      { $sort: { negativePercentage: -1, avgRating: 1, reviewCount: -1 } },
      { $limit: 12 },
      {
        $lookup: {
          from: 'dishes',
          localField: '_id',
          foreignField: '_id',
          as: 'dishData'
        }
      },
      {
        $unwind: '$dishData'
      }
    ]);

    const topRatedDishIds = new Set(topRatedDishes.map((item) => String(item._id)));
    const nonOverlappingNegative = negativeReviews
      .filter((item) => !topRatedDishIds.has(String(item._id)))
      .slice(0, 5);

    const formattedNegativeDishes = nonOverlappingNegative.map(item => ({
      dish: {
        _id: item.dishData._id,
        name: item.dishData.name,
        category: item.dishData.category
      },
      negativeCount: item.negativeCount,
      avgRating: item.avgRating.toFixed(1),
      totalReviews: item.reviewCount,
      negativePercentage: item.negativePercentage.toFixed(1)
    }));

    // Recent reviews (exclude deleted dishes)
    const recentReviews = await Review.find({ 
      createdAt: { $gte: daysAgo },
      dish: { $ne: null }
    })
      .populate('dish', 'name category')
      .sort({ createdAt: -1 })
      .limit(10);

    // Rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(item => {
      ratingDist[item._id] = item.count;
    });

    // Active dishes count
    const activeDishesCount = await Dish.countDocuments({ isActive: true });
    const totalDishesCount = await Dish.countDocuments();

    res.json({
      success: true,
      data: {
        summary: {
          totalReviews,
          totalReviewsInRange,
          averageRating: parseFloat(averageRating),
          activeDishes: activeDishesCount,
          totalDishes: totalDishesCount
        },
        sentiment: {
          breakdown: sentimentBreakdown,
          percentages: sentimentPercentages
        },
        sentimentDishContributors,
        ratingDistribution: ratingDist,
        topRatedDishes: formattedTopDishes,
        mostNegativeFeedback: formattedNegativeDishes,
        recentReviews
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching analytics' 
    });
  }
};

/**
 * @desc    Get sentiment trends over time
 * @route   GET /api/admin/sentiment-trends
 * @access  Private
 */
exports.getSentimentTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const trends = await Review.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sentiment: '$sentiment.label'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Format data for frontend charts
    const trendData = {};
    trends.forEach(item => {
      const date = item._id.date;
      if (!trendData[date]) {
        trendData[date] = { date, positive: 0, neutral: 0, negative: 0 };
      }
      trendData[date][item._id.sentiment] = item.count;
    });

    const formattedTrends = Object.values(trendData);

    res.json({
      success: true,
      data: formattedTrends
    });
  } catch (error) {
    console.error('Sentiment trends error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Get detailed analytics for specific dish
 * @route   GET /api/admin/dish-analytics/:dishId
 * @access  Private
 */
exports.getDishAnalytics = async (req, res) => {
  try {
    const dishId = req.params.dishId;

    // Check if dish exists
    const dish = await Dish.findById(dishId);
    if (!dish) {
      return res.status(404).json({ 
        success: false,
        message: 'Dish not found' 
      });
    }

    // Get all reviews for this dish
    const reviews = await Review.find({ dish: dishId })
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;

    // Sentiment breakdown
    const sentimentBreakdown = {
      positive: reviews.filter(r => r.sentiment.label === 'positive').length,
      neutral: reviews.filter(r => r.sentiment.label === 'neutral').length,
      negative: reviews.filter(r => r.sentiment.label === 'negative').length
    };

    // Average rating
    const avgRating = totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : 0;

    // Rating distribution
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      ratingDist[r.rating]++;
    });

    // Most common positive/negative words
    const allPositiveWords = reviews.flatMap(r => r.sentiment.positive);
    const allNegativeWords = reviews.flatMap(r => r.sentiment.negative);

    const wordFrequency = (words) => {
      const freq = {};
      words.forEach(word => {
        freq[word] = (freq[word] || 0) + 1;
      });
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
    };

    res.json({
      success: true,
      data: {
        dish,
        summary: {
          totalReviews,
          averageRating: parseFloat(avgRating),
          sentimentBreakdown,
          ratingDistribution: ratingDist
        },
        commonWords: {
          positive: wordFrequency(allPositiveWords),
          negative: wordFrequency(allNegativeWords)
        },
        recentReviews: reviews.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Dish analytics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};