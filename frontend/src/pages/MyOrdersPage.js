import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { orderAPI } from '../utils/api';
import { getDishImageSrc, getDishFallbackImage } from '../utils/dishImage';
import './CustomerExperience.css';

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await orderAPI.getMyOrders();
        setOrders(response.data?.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load your orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  if (loading) {
    return <div className="loading">Loading your orders...</div>;
  }

  return (
    <div className="customer-experience-page">
      <div className="container">
        <div className="page-header-block">
          <h1>My Orders</h1>
          <p>Track your placed orders and review dishes you ordered</p>
        </div>

        {orders.length === 0 ? (
          <div className="card empty-state-card">You have not placed any orders yet.</div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="card order-card-block">
                <div className="order-header-row">
                  <div>
                    <h3>Order ID: {order._id}</h3>
                    <p>{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`status-pill status-${order.status}`}>{order.status}</span>
                </div>

                <div className="ordered-items-wrap">
                  {order.items?.map((item, index) => {
                    const dishId = item.dish?._id || item.dish;
                    return (
                      <div key={`${order._id}-${index}`} className="ordered-item-row">
                        <div className="ordered-item-media">
                          <img
                            className="ordered-item-image"
                            src={getDishImageSrc(item.dish || { name: item.dishName, category: 'Special' })}
                            alt={item.dishName || item.dish?.name || 'Dish'}
                            onError={(event) => {
                              event.currentTarget.src = getDishFallbackImage(item.dishName || item.dish?.name, item.dish?.category || 'Special');
                            }}
                          />
                        </div>
                        <div className="ordered-item-content">
                          <strong>{item.dishName || item.dish?.name || 'Dish'}</strong>
                          <p>{item.quantity} x ₹{item.price}</p>
                        </div>
                        {dishId && order.status === 'delivered' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/review/${dishId}`)}
                          >
                            Give Review
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
