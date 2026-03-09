const Dish = require('../models/Dish');
const Review = require('../models/Review');
const { callRecommendML } = require('../utils/mlService');

exports.getRecommendations = async (req, res) => {
  try {
    const customerId = req.user.id;

    const allDishes = await Dish.find({ isActive: true, isAvailable: true })
      .select('name description category price imageUrl tags')
      .lean();

    const allDishIds = allDishes.map((dish) => dish._id.toString());

    const reviewedDishIds = (await Review.find({ customerId }).distinct('dish'))
      .filter(Boolean)
      .map((id) => id.toString());

    if (reviewedDishIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No personalized recommendations yet. Add a few reviews first.'
      });
    }

    const predictions = await callRecommendML(customerId, allDishIds, reviewedDishIds);

    const predictionMap = new Map(
      predictions.map((item) => [item.dishId?.toString(), item])
    );

    const fallbackDishIds = allDishIds.filter((id) => !reviewedDishIds.includes(id)).slice(0, 5);
    const orderedDishIds = predictions.length > 0
      ? predictions.map((item) => item.dishId?.toString()).filter(Boolean)
      : fallbackDishIds;

    const dishesById = new Map(allDishes.map((dish) => [dish._id.toString(), dish]));

    const data = orderedDishIds
      .map((dishId) => {
        const dish = dishesById.get(dishId);
        if (!dish) {
          return null;
        }

        const prediction = predictionMap.get(dishId);
        return {
          dish,
          predictedRating: prediction?.predictedRating || null,
          confidence: prediction?.confidence || null
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    return res.json({
      success: true,
      data,
      message: 'Recommendations fetched successfully'
    });
  } catch (error) {
    console.error('getRecommendations error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching recommendations'
    });
  }
};

exports.getPopularDishes = async (req, res) => {
  try {
    const popular = await Review.aggregate([
      {
        $match: {
          dish: { $ne: null },
          isVisible: { $ne: false }
        }
      },
      {
        $group: {
          _id: '$dish',
          dishName: { $first: '$dishName' },
          dishCategory: { $first: '$dishCategory' },
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      },
      { $sort: { avgRating: -1, reviewCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'dishes',
          let: {
            dishId: '$_id',
            dishName: '$dishName'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$dishId'] },
                    { $eq: ['$name', '$$dishName'] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'dishData'
        }
      },
      {
        $unwind: {
          path: '$dishData',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $project: {
          _id: 0,
          dish: {
            _id: '$dishData._id',
            name: '$dishData.name',
            category: '$dishData.category',
            price: '$dishData.price',
            imageUrl: '$dishData.imageUrl'
          },
          avgRating: { $round: ['$avgRating', 2] },
          reviewCount: 1
        }
      }
    ]);

    return res.json({
      success: true,
      data: popular,
      message: 'Popular dishes fetched successfully'
    });
  } catch (error) {
    console.error('getPopularDishes error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching popular dishes'
    });
  }
};
