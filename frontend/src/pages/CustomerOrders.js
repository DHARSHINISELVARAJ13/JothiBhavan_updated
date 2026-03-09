import React, { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { dishAPI, orderAPI, recommendationAPI } from '../utils/api';
import { ShoppingCart, Plus, Minus, XCircle, Sparkles } from 'lucide-react';
import { getDishImageSrc, getDishFallbackImage } from '../utils/dishImage';
import './CustomerOrders.css';

const CustomerOrders = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryDishId = searchParams.get('dishId') || '';
  const cartFocusedView = searchParams.get('view') === 'cart';
  const queryHandledRef = useRef(false);

  const [dishes, setDishes] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [popularDishes, setPopularDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [cartItems, setCartItems] = useState([]);
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dishesRes, ordersRes, recRes, popularRes] = await Promise.all([
        dishAPI.getActive(),
        orderAPI.getMyOrders(),
        recommendationAPI.getMyRecommendations(),
        recommendationAPI.getPopular()
      ]);

      setDishes(dishesRes.data?.data || []);
      setMyOrders(ordersRes.data?.data || []);
      setRecommendations(recRes.data?.data || []);
      setPopularDishes(popularRes.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load order data');
    } finally {
      setLoading(false);
    }
  };

  const dishMap = useMemo(() => {
    const map = new Map();
    dishes.forEach((dish) => map.set(dish._id, dish));
    return map;
  }, [dishes]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  const addDishToCartById = (dishId, quantity = 1, showToast = true) => {
    if (!dishId) {
      toast.error('Please select a dish');
      return false;
    }

    const dish = dishMap.get(dishId);
    if (!dish) {
      toast.error('Selected dish is not available');
      return false;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.dish === dishId);
      if (existing) {
        return prev.map((item) => item.dish === dishId
          ? { ...item, quantity: item.quantity + quantity }
          : item
        );
      }

      return [
        ...prev,
        {
          dish: dishId,
          dishName: dish.name,
          price: dish.price,
          quantity
        }
      ];
    });

    if (showToast) {
      toast.success(`${dish.name} added to cart`);
    }

    return true;
  };

  useEffect(() => {
    if (!queryDishId || queryHandledRef.current || dishes.length === 0) {
      return;
    }

    const added = addDishToCartById(queryDishId, 1, true);
    if (added) {
      queryHandledRef.current = true;
    }
  }, [queryDishId, dishes, dishMap]);

  const changeQuantity = (dishId, nextQty) => {
    if (nextQty < 1) {
      return;
    }

    setCartItems((prev) => prev.map((item) => (
      item.dish === dishId ? { ...item, quantity: nextQty } : item
    )));
  };

  const removeItem = (dishId) => {
    setCartItems((prev) => prev.filter((item) => item.dish !== dishId));
  };

  const placeOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Add at least one item to place an order');
      return;
    }

    try {
      setPlacingOrder(true);
      const payload = {
        items: cartItems.map((item) => ({ dish: item.dish, quantity: item.quantity })),
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : '',
        specialInstructions
      };

      const response = await orderAPI.place(payload);
      toast.success(response.data?.message || 'Order placed successfully');

      setCartItems([]);
      setOrderType('dine-in');
      setTableNumber('');
      setSpecialInstructions('');

      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      const response = await orderAPI.cancelMyOrder(orderId);
      toast.success(response.data?.message || 'Order cancelled successfully');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="customer-orders-page">
      <div className="container">
        <div className="page-header">
          <h1><ShoppingCart size={28} /> Food Ordering</h1>
          <p>Place orders, track status, and discover recommended dishes</p>
        </div>

        <div className="orders-layout">
          <section className="card place-order-section">
            <h2>{cartFocusedView ? 'Cart Items' : 'Place New Order'}</h2>

            {!cartFocusedView && (
              <div className="input-group">
                <label>Select from Menu (click to view dish)</label>
                {dishes.length === 0 ? (
                  <p className="empty-text">No dishes available currently.</p>
                ) : (
                  <div className="recommendation-list">
                    {dishes.map((dish) => (
                      <div
                        key={dish._id}
                        className="recommendation-item"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/dish/${dish._id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/dish/${dish._id}`);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <img
                          className="dish-thumb"
                          src={getDishImageSrc(dish)}
                          alt={dish.name}
                          onError={(event) => {
                            event.currentTarget.src = getDishFallbackImage(dish.name, dish.category);
                          }}
                        />
                        <div>
                          <strong>{dish.name}</strong>
                          <p>{dish.category} • ₹{dish.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!cartFocusedView && (
              <div className="input-row">
                <div className="input-group">
                  <label>Order Type</label>
                  <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                    <option value="dine-in">Dine-in</option>
                    <option value="takeaway">Takeaway</option>
                  </select>
                </div>

                {orderType === 'dine-in' && (
                  <div className="input-group">
                    <label>Table Number</label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>
            )}

            {!cartFocusedView && (
              <div className="input-group">
                <label>Special Instructions</label>
                <textarea
                  rows="3"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Optional instructions"
                />
              </div>
            )}

            <div className="cart-block">
              <h3>Cart Items</h3>
              {cartItems.length === 0 ? (
                <p className="empty-text">No items in cart yet.</p>
              ) : (
                <div className="cart-list">
                  {cartItems.map((item) => (
                    <div key={item.dish} className="cart-row">
                      <img
                        className="cart-thumb"
                        src={getDishImageSrc(dishMap.get(item.dish) || { name: item.dishName, category: 'Special' })}
                        alt={item.dishName}
                        onError={(event) => {
                          event.currentTarget.src = getDishFallbackImage(item.dishName, 'Special');
                        }}
                      />
                      <div>
                        <strong>{item.dishName}</strong>
                        <p>₹{item.price} each</p>
                      </div>
                      <div className="qty-actions">
                        <button type="button" onClick={() => changeQuantity(item.dish, item.quantity - 1)}>
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => changeQuantity(item.dish, item.quantity + 1)}>
                          <Plus size={14} />
                        </button>
                        <button type="button" className="danger" onClick={() => removeItem(item.dish)}>
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="cart-footer">
                <strong>Total: ₹{cartTotal.toFixed(2)}</strong>
                <button type="button" className="btn btn-success" disabled={placingOrder} onClick={placeOrder}>
                  {placingOrder ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </section>

          <section className="card recommendation-section">
            <h2><Sparkles size={20} /> Recommended For You</h2>
            {recommendations.length === 0 ? (
              <p className="empty-text">No personalized recommendations yet.</p>
            ) : (
              <div className="recommendation-list">
                {recommendations.map((entry, index) => (
                  <div
                    key={entry.dish?._id || index}
                    className="recommendation-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => entry.dish?._id && addDishToCartById(entry.dish._id, 1, true)}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && entry.dish?._id) {
                        event.preventDefault();
                        addDishToCartById(entry.dish._id, 1, true);
                      }
                    }}
                    style={{ cursor: entry.dish?._id ? 'pointer' : 'default' }}
                  >
                    {entry.dish && (
                      <img
                        className="dish-thumb"
                        src={getDishImageSrc(entry.dish)}
                        alt={entry.dish?.name}
                        onError={(event) => {
                          event.currentTarget.src = getDishFallbackImage(entry.dish?.name, entry.dish?.category);
                        }}
                      />
                    )}
                    <div>
                      <strong>{entry.dish?.name}</strong>
                      <p>{entry.dish?.category} • ₹{entry.dish?.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="popular-heading">Popular Dishes</h3>
            {popularDishes.length === 0 ? (
              <p className="empty-text">No popular dishes available yet.</p>
            ) : (
              <div className="recommendation-list">
                {popularDishes.slice(0, 5).map((entry, index) => (
                  <div
                    key={entry.dish?._id || index}
                    className="recommendation-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => entry.dish?._id && addDishToCartById(entry.dish._id, 1, true)}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && entry.dish?._id) {
                        event.preventDefault();
                        addDishToCartById(entry.dish._id, 1, true);
                      }
                    }}
                    style={{ cursor: entry.dish?._id ? 'pointer' : 'default' }}
                  >
                    {entry.dish && (
                      <img
                        className="dish-thumb"
                        src={getDishImageSrc(entry.dish)}
                        alt={entry.dish?.name}
                        onError={(event) => {
                          event.currentTarget.src = getDishFallbackImage(entry.dish?.name, entry.dish?.category);
                        }}
                      />
                    )}
                    <div>
                      <strong>{entry.dish?.name}</strong>
                      <p>{entry.dish?.category} • {entry.dish?.price !== undefined && entry.dish?.price !== null ? `₹${entry.dish.price}` : 'Price unavailable'}</p>
                    </div>
                    <div className="rec-meta">
                      <span>Avg: {Number(entry.avgRating || 0).toFixed(2)}</span>
                      <span>{entry.reviewCount || 0} reviews</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {!cartFocusedView && (
          <section className="card my-orders-section">
            <h2>My Orders</h2>
            {myOrders.length === 0 ? (
              <p className="empty-text">You have not placed any orders yet.</p>
            ) : (
              <div className="my-orders-list">
                {myOrders.map((order) => (
                  <div key={order._id} className="order-card">
                    <div className="order-card-header">
                      <div>
                        <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
                        <p>{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="order-meta">
                        <span className={`badge status-${order.status}`}>{order.status}</span>
                        <span className="badge">{order.orderType}</span>
                        <strong>₹{Number(order.totalAmount || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="order-items">
                      {order.items?.map((item, idx) => (
                        <div key={`${order._id}-${idx}`} className="order-item-row">
                          <span>{item.dishName || item.dish?.name}</span>
                          <span>{item.quantity} × ₹{item.price}</span>
                        </div>
                      ))}
                    </div>

                    {order.status === 'pending' && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => cancelOrder(order._id)}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
