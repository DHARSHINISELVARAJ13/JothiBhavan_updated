import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Star } from 'lucide-react';
import { customerAPI, dishAPI, orderAPI, reviewAPI } from '../utils/api';
import './CustomerExperience.css';

const DishReviewPage = () => {
  const { dishId } = useParams();
  const navigate = useNavigate();

  const [dish, setDish] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dishRes, customerRes, ordersRes] = await Promise.all([
          dishAPI.getById(dishId),
          customerAPI.getMe(),
          orderAPI.getMyOrders()
        ]);

        setDish(dishRes.data?.data || null);
        setCustomer(customerRes.data?.customer || null);
        setOrders(ordersRes.data?.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load review page');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dishId]);

  const canReviewDish = useMemo(() => {
    return orders.some((order) =>
      (order.items || []).some((item) => {
        const orderedDishId = item.dish?._id || item.dish;
        return String(orderedDishId) === String(dishId);
      })
    );
  }, [orders, dishId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canReviewDish) {
      toast.error('You can only review dishes you have ordered');
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating between 1 and 5');
      return;
    }

    if (reviewText.trim().length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      await reviewAPI.create({
        customerName: customer?.name || 'Customer',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        dish: dishId,
        rating,
        reviewText: reviewText.trim()
      });

      toast.success('Review submitted successfully');
      navigate('/my-orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading review form...</div>;
  }

  if (!dish) {
    return (
      <div className="customer-experience-page">
        <div className="container">
          <div className="card empty-state-card">
            <p>Dish not found.</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/my-orders')}>
              Back to My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-experience-page">
      <div className="container">
        <div className="card review-card-block">
          <h1>Review Dish</h1>
          <p className="review-target">{dish.name}</p>

          {!canReviewDish && (
            <p className="review-warning">
              You can review only dishes from your orders. Please order this dish first.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Rating</label>
              <div className="star-inline">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="star-pick"
                    onClick={() => setRating(star)}
                    disabled={!canReviewDish}
                    aria-label={`Rate ${star}`}
                  >
                    <Star size={26} fill={star <= rating ? '#fbbf24' : 'none'} stroke="#f59e0b" />
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="reviewText">Your Review</label>
              <textarea
                id="reviewText"
                rows="5"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="Write your review (minimum 10 characters)"
                disabled={!canReviewDish}
              />
            </div>

            <div className="action-row">
              <button type="submit" className="btn btn-primary" disabled={!canReviewDish || submitting}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/my-orders')}>
                Back to My Orders
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DishReviewPage;
