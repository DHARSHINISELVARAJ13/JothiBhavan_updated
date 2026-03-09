const Order = require('../models/Order');
const Dish = require('../models/Dish');
const Customer = require('../models/Customer');

const toDayRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00.000Z`);
  const end = new Date(`${dateString}T23:59:59.999Z`);
  return { start, end };
};

exports.placeOrder = async (req, res) => {
  try {
    const { items, orderType = 'dine-in', tableNumber = '', specialInstructions = '' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Order must include at least one item'
      });
    }

    const customer = await Customer.findById(req.user.id).select('name email phone');
    if (!customer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Customer not found'
      });
    }

    const preparedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.dish || Number.isNaN(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Each item must include a valid dish and quantity >= 1'
        });
      }

      const dish = await Dish.findById(item.dish);
      if (!dish || !dish.isActive || !dish.isAvailable) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Dish is unavailable: ${item.dish}`
        });
      }

      const subtotal = Number((dish.price * quantity).toFixed(2));
      totalAmount += subtotal;

      preparedItems.push({
        dish: dish._id,
        dishName: dish.name,
        price: dish.price,
        quantity,
        subtotal
      });
    }

    totalAmount = Number(totalAmount.toFixed(2));

    const order = await Order.create({
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
      items: preparedItems,
      totalAmount,
      status: 'pending',
      orderType,
      tableNumber,
      specialInstructions
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customerId', 'name email phone')
      .populate('items.dish', 'name price category imageUrl');

    return res.status(201).json({
      success: true,
      data: populatedOrder,
      message: 'Order placed successfully'
    });
  } catch (error) {
    console.error('placeOrder error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while placing order'
    });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user.id })
      .populate('items.dish', 'name price category imageUrl')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: orders,
      message: 'Orders fetched successfully'
    });
  } catch (error) {
    console.error('getMyOrders error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching orders'
    });
  }
};

exports.getMyOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, customerId: req.user.id })
      .populate('customerId', 'name email phone')
      .populate('items.dish', 'name description category price imageUrl isActive isAvailable tags');

    if (!order) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Order not found'
      });
    }

    return res.json({
      success: true,
      data: order,
      message: 'Order fetched successfully'
    });
  } catch (error) {
    console.error('getMyOrderById error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching order'
    });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, customerId: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Only pending orders can be cancelled'
      });
    }

    order.status = 'cancelled';
    order.updatedAt = Date.now();
    await order.save();

    return res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('cancelOrder error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while cancelling order'
    });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const {
      status,
      orderType,
      date,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (orderType) {
      query.orderType = orderType;
    }

    if (date) {
      const { start, end } = toDayRange(date);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNumber - 1) * pageSize;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customerId', 'name email')
        .populate('items.dish', 'name price category imageUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Order.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: {
        orders,
        total,
        page: pageNumber,
        pages: Math.ceil(total / pageSize),
        limit: pageSize
      },
      message: 'Orders fetched successfully'
    });
  } catch (error) {
    console.error('getAllOrders error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching all orders'
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid status value'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Order not found'
      });
    }

    const transitions = {
      pending: ['confirmed'],
      confirmed: ['preparing'],
      preparing: ['ready'],
      ready: ['delivered'],
      delivered: [],
      cancelled: []
    };

    const isCancelledTransition = status === 'cancelled';
    const isValidForwardTransition = transitions[order.status].includes(status);

    if (!isCancelledTransition && !isValidForwardTransition) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Invalid status transition from ${order.status} to ${status}`
      });
    }

    order.status = status;
    order.updatedAt = Date.now();
    await order.save();

    return res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while updating order status'
    });
  }
};

exports.getOrderStats = async (req, res) => {
  try {
    const [totalOrders, revenueAgg, statusAgg, topDishesAgg] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            deliveredCount: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.dish',
            dishName: { $first: '$items.dishName' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ])
    ]);

    const ordersByStatus = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0
    };

    statusAgg.forEach((item) => {
      if (ordersByStatus[item._id] !== undefined) {
        ordersByStatus[item._id] = item.count;
      }
    });

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    const deliveredCount = revenueAgg[0]?.deliveredCount || 0;
    const averageOrderValue = deliveredCount > 0 ? Number((totalRevenue / deliveredCount).toFixed(2)) : 0;

    const topOrderedDishes = topDishesAgg.map((dish) => ({
      dishName: dish.dishName || 'Unknown Dish',
      totalQuantity: dish.totalQuantity,
      totalRevenue: Number((dish.totalRevenue || 0).toFixed(2))
    }));

    return res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        ordersByStatus,
        averageOrderValue,
        topOrderedDishes
      },
      message: 'Order stats fetched successfully'
    });
  } catch (error) {
    console.error('getOrderStats error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching order stats'
    });
  }
};
