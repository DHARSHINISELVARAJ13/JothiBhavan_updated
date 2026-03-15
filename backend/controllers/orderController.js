const Order = require('../models/Order');
const Dish = require('../models/Dish');
const Customer = require('../models/Customer');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const normalizeCheckoutData = ({ orderType = 'dine-in', tableNumber = '', specialInstructions = '' } = {}) => ({
  orderType: ['dine-in', 'takeaway'].includes(orderType) ? orderType : 'dine-in',
  tableNumber: orderType === 'dine-in' ? String(tableNumber || '').trim() : '',
  specialInstructions: String(specialInstructions || '').trim()
});

const buildReceipt = () => `rcpt_${Date.now()}_${Math.floor(Math.random() * 100000)}`.slice(0, 40);

const calculateCheckoutSummary = async (items = []) => {
  const preparedItems = [];
  let totalAmount = 0;

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Order must include at least one item');
    error.statusCode = 400;
    throw error;
  }

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!item.dish || Number.isNaN(quantity) || quantity < 1) {
      const error = new Error('Each item must include a valid dish and quantity >= 1');
      error.statusCode = 400;
      throw error;
    }

    const dish = await Dish.findById(item.dish).select('_id name price isActive isAvailable');
    if (!dish || !dish.isActive || !dish.isAvailable) {
      const error = new Error(`Dish is unavailable: ${item.dish}`);
      error.statusCode = 400;
      throw error;
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
  const amountInPaise = Math.round(totalAmount * 100);

  return { preparedItems, totalAmount, amountInPaise };
};

const buildCheckoutHash = ({
  customerId,
  preparedItems,
  totalAmount,
  orderType,
  tableNumber,
  specialInstructions
}) => {
  const normalizedItems = [...preparedItems]
    .map((item) => ({
      dish: String(item.dish),
      quantity: Number(item.quantity),
      price: Number(item.price),
      subtotal: Number(item.subtotal)
    }))
    .sort((a, b) => a.dish.localeCompare(b.dish));

  const payload = JSON.stringify({
    customerId: String(customerId),
    totalAmount: Number(totalAmount),
    orderType,
    tableNumber,
    specialInstructions,
    items: normalizedItems
  });

  const hashSecret = process.env.RAZORPAY_KEY_SECRET || process.env.JWT_SECRET || 'checkout_hash_fallback';
  return crypto.createHmac('sha256', hashSecret).update(payload).digest('hex');
};

const verifyRazorpaySignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return false;
  }

  const generated = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  return generated === razorpay_signature;
};

const normalizePaymentMethod = (rawMethod = '') => {
  const value = String(rawMethod || '').trim().toLowerCase();
  return value || 'razorpay';
};

const toDayRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00.000Z`);
  const end = new Date(`${dateString}T23:59:59.999Z`);
  return { start, end };
};

exports.placeOrder = async (req, res) => {
  return res.status(400).json({
    success: false,
    data: null,
    message: 'Direct order placement is disabled. Complete Razorpay payment first.'
  });
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { items, orderType = 'dine-in', tableNumber = '', specialInstructions = '' } = req.body;
    const razorpayClient = getRazorpayClient();

    if (!razorpayClient) {
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Razorpay is not configured on server'
      });
    }

    const normalizedCheckout = normalizeCheckoutData({ orderType, tableNumber, specialInstructions });
    const { preparedItems, totalAmount, amountInPaise } = await calculateCheckoutSummary(items);

    const customer = await Customer.findById(req.user.id).select('name email phone');
    if (!customer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Customer not found'
      });
    }

    const razorpayOrder = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: buildReceipt(),
      notes: {
        customerId: String(customer._id),
        orderType: normalizedCheckout.orderType
      }
    });

    const checkoutHash = buildCheckoutHash({
      customerId: customer._id,
      preparedItems,
      totalAmount,
      orderType: normalizedCheckout.orderType,
      tableNumber: normalizedCheckout.tableNumber,
      specialInstructions: normalizedCheckout.specialInstructions
    });

    return res.json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpay_order_id: razorpayOrder.id,
        checkoutHash,
        customer: {
          name: customer.name || 'Customer',
          email: customer.email || '',
          contact: customer.phone || ''
        }
      },
      message: 'Razorpay order created successfully'
    });
  } catch (error) {
    console.error('createRazorpayOrder error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      data: null,
      message: error.message || 'Server error while creating Razorpay order'
    });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      orderType = 'dine-in',
      tableNumber = '',
      specialInstructions = '',
      checkoutHash
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !checkoutHash) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Missing required Razorpay payment verification fields'
      });
    }

    const razorpayClient = getRazorpayClient();
    if (!razorpayClient) {
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Razorpay is not configured on server'
      });
    }

    if (!verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid Razorpay signature'
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

    const normalizedCheckout = normalizeCheckoutData({ orderType, tableNumber, specialInstructions });
    const { preparedItems, totalAmount, amountInPaise } = await calculateCheckoutSummary(items);

    const expectedCheckoutHash = buildCheckoutHash({
      customerId: customer._id,
      preparedItems,
      totalAmount,
      orderType: normalizedCheckout.orderType,
      tableNumber: normalizedCheckout.tableNumber,
      specialInstructions: normalizedCheckout.specialInstructions
    });

    if (checkoutHash !== expectedCheckoutHash) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Checkout payload mismatch detected. Please retry payment.'
      });
    }

    const existingOrder = await Order.findOne({ razorpay_payment_id, customerId: customer._id });
    if (existingOrder) {
      return res.json({
        success: true,
        data: existingOrder,
        message: 'Payment already verified and order already exists'
      });
    }

    const razorpayOrder = await razorpayClient.orders.fetch(razorpay_order_id);
    if (!razorpayOrder || razorpayOrder.amount !== amountInPaise || razorpayOrder.currency !== 'INR') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Razorpay order amount/currency mismatch'
      });
    }

    let paymentMethod = 'razorpay';
    try {
      const paymentDetails = await razorpayClient.payments.fetch(razorpay_payment_id);
      paymentMethod = normalizePaymentMethod(paymentDetails?.method || 'razorpay');
    } catch (fetchError) {
      paymentMethod = 'razorpay';
    }

    const order = await Order.create({
      customerId: customer._id,
      customerName: customer.name || '',
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
      items: preparedItems,
      totalAmount,
      status: 'pending',
      order_status: 'pending',
      orderType: normalizedCheckout.orderType,
      tableNumber: normalizedCheckout.tableNumber,
      specialInstructions: normalizedCheckout.specialInstructions,
      paymentStatus: 'paid',
      payment_status: 'paid',
      payment_method: paymentMethod,
      razorpay_order_id,
      razorpay_payment_id
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customerId', 'name email phone')
      .populate('items.dish', 'name price category imageUrl');

    return res.status(201).json({
      success: true,
      data: populatedOrder,
      message: 'Payment verified and order placed successfully'
    });
  } catch (error) {
    console.error('verifyRazorpayPayment error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      data: null,
      message: error.message || 'Server error while verifying payment'
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
    order.order_status = 'cancelled';
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
    order.order_status = status;
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
    const [totalOrders, revenueAgg, statusAgg, topDishesAgg, customerInsightsAgg] = await Promise.all([
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
      ]),
      Order.aggregate([
        {
          $group: {
            _id: '$customerId',
            customerName: { $first: '$customerName' },
            customerEmail: { $first: '$customerEmail' },
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 }
          }
        },
        {
          $facet: {
            byRevenue: [
              { $sort: { totalRevenue: -1, totalOrders: -1 } },
              { $limit: 1 }
            ],
            byOrders: [
              { $sort: { totalOrders: -1, totalRevenue: -1 } },
              { $limit: 1 }
            ]
          }
        }
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

    const insights = customerInsightsAgg[0] || {};
    const mostRevenueCustomerRaw = insights.byRevenue?.[0] || null;
    const mostOrdersCustomerRaw = insights.byOrders?.[0] || null;

    const mostRevenueCustomer = mostRevenueCustomerRaw
      ? {
          customerId: mostRevenueCustomerRaw._id,
          name: mostRevenueCustomerRaw.customerName || 'Unknown Customer',
          email: mostRevenueCustomerRaw.customerEmail || '-',
          totalRevenue: Number((mostRevenueCustomerRaw.totalRevenue || 0).toFixed(2)),
          totalOrders: mostRevenueCustomerRaw.totalOrders || 0
        }
      : null;

    const mostOrdersCustomer = mostOrdersCustomerRaw
      ? {
          customerId: mostOrdersCustomerRaw._id,
          name: mostOrdersCustomerRaw.customerName || 'Unknown Customer',
          email: mostOrdersCustomerRaw.customerEmail || '-',
          totalRevenue: Number((mostOrdersCustomerRaw.totalRevenue || 0).toFixed(2)),
          totalOrders: mostOrdersCustomerRaw.totalOrders || 0
        }
      : null;

    return res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        ordersByStatus,
        averageOrderValue,
        topOrderedDishes,
        customerInsights: {
          mostRevenueCustomer,
          mostOrdersCustomer
        }
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
