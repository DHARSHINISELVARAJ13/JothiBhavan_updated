import React, { useState, useEffect, useCallback } from 'react';
import { reviewAPI } from '../utils/api';
import { Star, ThumbsUp, ThumbsDown, Minus, Eye, EyeOff, Trash2, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import './ReviewManagement.css';

// Helper function to extract dish name from review text
const extractDishNameFromReview = (reviewText) => {
  if (!reviewText) return 'Unknown Dish';
  
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = reviewText.match(capitalizedPattern);
  
  if (matches && matches.length > 0) {
    const commonWords = ['The', 'This', 'That', 'Very', 'Really', 'Good', 'Bad', 'Nice', 'Great', 'Excellent', 'Amazing', 'Delicious', 'Tasty', 'Wonderful', 'Awesome', 'Perfect', 'Beautiful', 'Lovely', 'Fantastic'];
    const filtered = matches.filter(word => !commonWords.includes(word));
    if (filtered.length > 0) return filtered[0];
  }
  
  const patterns = [
    /the ([a-zA-Z\s]+) (?:is|was|tastes)/i,
    /tried (?:the )?([a-zA-Z\s]+?)(?:\.|,|and|\s+is|\s+was)/i,
    /loved? (?:the )?([a-zA-Z\s]+?)(?:\.|,|!|\s+is|\s+was)/i,
  ];
  
  for (const pattern of patterns) {
    const match = reviewText.match(pattern);
    if (match && match[1]) {
      return match[1].trim()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }
  
  return 'Unknown Dish';
};

const ReviewManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    sentiment: 'all',
    rating: 'all'
  });

  const loadReviews = useCallback(async ({ showLoading = false, silent = false } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      if (!showLoading && !silent) {
        setRefreshing(true);
      }

      const params = {};
      if (filters.sentiment !== 'all') params.sentiment = filters.sentiment;
      if (filters.rating !== 'all') params.rating = filters.rating;
      params.page = 1;
      params.limit = 100000;
      
      const response = await reviewAPI.getAll(params);
      setReviews(response.data.data);
      setTotalReviews(response.data.total || 0);
    } catch (error) {
      if (!silent) {
        toast.error('Failed to load reviews');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReviews({ showLoading: true });
  }, [loadReviews]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadReviews({ showLoading: false, silent: true });
    }, 15000);

    return () => clearInterval(interval);
  }, [loadReviews]);

  const handleToggleVisibility = async (review) => {
    try {
      await reviewAPI.toggleVisibility(review._id);
      toast.success(`Review ${!review.isVisible ? 'shown' : 'hidden'}`);
      loadReviews();
    } catch (error) {
      toast.error('Failed to toggle visibility');
    }
  };

  const handleDelete = async (review) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await reviewAPI.delete(review._id);
      toast.success('Review deleted successfully');
      loadReviews();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return <div className="loading">Loading reviews...</div>;
  }

  return (
    <div className="review-management">
      <div className="container">
        <div className="page-header">
          <h1>Review Management</h1>
          <div className="filter-controls">
            <div className="filter-group">
              <Filter size={18} />
              <select name="sentiment" value={filters.sentiment} onChange={handleFilterChange}>
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
              <select name="rating" value={filters.rating} onChange={handleFilterChange}>
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => loadReviews({ showLoading: false })}
                disabled={refreshing}
              >
                <RefreshCw size={16} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="reviews-stats card">
          <div className="stat-item">
            <span className="stat-label">Total Reviews:</span>
            <span className="stat-value">{totalReviews}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Positive:</span>
            <span className="stat-value positive">
              {reviews.filter(r => r.sentiment.label === 'positive').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Neutral:</span>
            <span className="stat-value neutral">
              {reviews.filter(r => r.sentiment.label === 'neutral').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Negative:</span>
            <span className="stat-value negative">
              {reviews.filter(r => r.sentiment.label === 'negative').length}
            </span>
          </div>
        </div>

        <div className="reviews-list">
          {reviews.map(review => {
            const dishName = review.dish?.name || review.dishName || extractDishNameFromReview(review.reviewText);
            return (
              <div key={review._id} className={`review-card card ${!review.isVisible ? 'hidden-review' : ''}`}>
                <div className="review-header">
                  <div className="review-customer-info">
                    <h3>{review.customerName}</h3>
                    {review.customerEmail && <span className="customer-email">{review.customerEmail}</span>}
                    {review.customerPhone && <span className="customer-phone">{review.customerPhone}</span>}
                  </div>
                  <div className="review-meta">
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {!review.isVisible && <span className="visibility-badge">Hidden</span>}
                  </div>
                </div>

                <div className="review-body">
                  <div className="review-dish-info">
                    <span className="dish-name">{dishName}</span>
                    <span className="dish-category">{review.dish?.category || review.dishCategory || 'N/A'}</span>
                  </div>

                <div className="review-rating-sentiment">
                  <div className="rating-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        fill={i < review.rating ? '#fbbf24' : 'none'}
                        color="#fbbf24"
                      />
                    ))}
                    <span className="rating-number">{review.rating}/5</span>
                  </div>
                  <div className={`sentiment-badge ${review.sentiment.label}`}>
                    {review.sentiment.label === 'positive' && <ThumbsUp size={16} />}
                    {review.sentiment.label === 'negative' && <ThumbsDown size={16} />}
                    {review.sentiment.label === 'neutral' && <Minus size={16} />}
                    {review.sentiment.label}
                    <span className="sentiment-score">
                      Score: {review.sentiment.score.toFixed(1)}
                    </span>
                  </div>
                </div>

                <p className="review-text">{review.reviewText}</p>

                {(review.sentiment.positive.length > 0 || review.sentiment.negative.length > 0) && (
                  <div className="sentiment-keywords">
                    {review.sentiment.positive.length > 0 && (
                      <div className="keywords-group positive">
                        <strong>Positive words:</strong>
                        <span>{review.sentiment.positive.slice(0, 5).join(', ')}</span>
                      </div>
                    )}
                    {review.sentiment.negative.length > 0 && (
                      <div className="keywords-group negative">
                        <strong>Negative words:</strong>
                        <span>{review.sentiment.negative.slice(0, 5).join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="review-actions">
                <button
                  className="btn-action"
                  onClick={() => handleToggleVisibility(review)}
                  title={review.isVisible ? 'Hide review' : 'Show review'}
                >
                  {review.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  {review.isVisible ? 'Hide' : 'Show'}
                </button>
                <button
                  className="btn-action danger"
                  onClick={() => handleDelete(review)}
                  title="Delete review"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {reviews.length === 0 && (
          <div className="no-data card">
            <p>No reviews found with the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewManagement;