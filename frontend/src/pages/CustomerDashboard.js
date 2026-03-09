import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { customerAPI, reviewAPI } from '../utils/api';
import '../styles/CustomerDashboard.css';
import { User, LogOut, UtensilsCrossed, MessageSquare, Clock, Star } from 'lucide-react';

// Helper function to extract dish name from review text
const extractDishNameFromReview = (reviewText) => {
  if (!reviewText) return 'Unknown Dish';
  
  // Try to find capitalized words (likely dish names)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = reviewText.match(capitalizedPattern);
  
  if (matches && matches.length > 0) {
    // Filter out common words that aren't dish names
    const commonWords = ['The', 'This', 'That', 'Very', 'Really', 'Good', 'Bad', 'Nice', 'Great', 'Excellent', 'Amazing', 'Delicious', 'Tasty', 'Wonderful', 'Awesome', 'Perfect', 'Beautiful', 'Lovely', 'Fantastic'];
    const filtered = matches.filter(word => !commonWords.includes(word));
    
    if (filtered.length > 0) {
      return filtered[0];
    }
  }
  
  // If no capitalized words found, try to extract from common patterns
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

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const token = localStorage.getItem('customerToken');
        console.log('[Dashboard] Checking token:', !!token);
        
        if (!token) {
          console.log('[Dashboard] No token found, redirecting to login');
          navigate('/customer/login', { replace: true });
          setLoading(false);
          return;
        }

        console.log('[Dashboard] Token found, fetching customer data');
        
        // Fetch customer data
        const response = await customerAPI.getMe();
        console.log('[Dashboard] API Response:', response.status, response.data);
        
        if (response.data.success) {
          console.log('[Dashboard] Setting customer:', response.data.customer.name);
          setCustomer(response.data.customer);
          
          // Fetch reviews
          try {
            const reviewsResponse = await reviewAPI.getByCustomer();
            console.log('[Dashboard] Reviews fetched:', reviewsResponse.data.count);
            setReviews(reviewsResponse.data.data || []);
          } catch (reviewError) {
            console.error('[Dashboard] Review fetch error:', reviewError.message);
            // Don't fail dashboard if reviews fail
            setReviews([]);
          }
        } else {
          console.error('[Dashboard] API returned success: false');
          toast.error('Failed to load customer data');
        }
      } catch (error) {
        console.error('[Dashboard] Full error:', error);
        console.error('[Dashboard] Error response:', error.response?.data);
        
        if (error.response?.status === 401) {
          console.log('[Dashboard] 401 error, clearing token and redirecting');
          localStorage.removeItem('customerToken');
          navigate('/customer/login', { replace: true });
        } else {
          toast.error(error.response?.data?.message || 'Failed to load dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleViewMenu = () => {
    navigate('/menu');
  };

  const handleGiveFeedback = () => {
    navigate('/my-orders');
  };

  const handleOrderFood = () => {
    navigate('/customer/orders');
  };

  if (loading) {
    return <div className="loading">Loading your dashboard...</div>;
  }

  if (!customer) {
    return <div className="loading">Redirecting...</div>;
  }

  return (
    <div className="customer-dashboard">
      <div className="dashboard-container">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <User size={32} className="header-icon" />
            <div className="header-text">
              <h1>Welcome, {customer.name}!</h1>
              <p>Your personalized dining hub at Jothi Bavan</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={20} />
            Logout
          </button>
        </div>

        {/* Profile Info Card */}
        <div className="profile-card">
          <h2>Your Profile</h2>
          <div className="profile-details">
            <div className="detail-item">
              <span className="detail-label">Name</span>
              <span className="detail-value">{customer.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{customer.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Member Since</span>
              <span className="detail-value">
                {new Date(customer.createdAt).toLocaleDateString()}
              </span>
            </div>
            {customer.phone && (
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{customer.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>What would you like to do?</h2>
          <div className="actions-grid">
            <div 
              className="action-card"
              onClick={handleViewMenu}
            >
              <UtensilsCrossed size={40} />
              <h3>View Menu</h3>
              <p>Explore our delicious dishes and special offerings</p>
              <button className="btn-action">Browse Menu</button>
            </div>

            <div 
              className="action-card"
              onClick={handleGiveFeedback}
            >
              <MessageSquare size={40} />
              <h3>Give Feedback</h3>
              <p>Share your dining experience and help us improve</p>
              <button className="btn-action">Leave Review</button>
            </div>

            <div
              className="action-card"
              onClick={handleOrderFood}
            >
              <UtensilsCrossed size={40} />
              <h3>Order Food</h3>
              <p>Place dine-in or takeaway orders and track order status</p>
              <button className="btn-action">Start Ordering</button>
            </div>
          </div>
        </div>

        {/* My Reviews Section */}
        {reviews.length > 0 && (
          <div className="reviews-section">
            <h2>Your Reviews ({reviews.length})</h2>
            <div className="reviews-grid">
              {reviews.map((review) => {
                const dishName = review.dish?.name || review.dishName || extractDishNameFromReview(review.reviewText);
                
                return (
                  <div key={review._id} className="review-card">
                    <div className="review-header">
                      <h3>{dishName}</h3>
                      <div className="review-rating">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={16} 
                          className="star-filled" 
                        />
                      ))}
                      {[...Array(5 - review.rating)].map((_, i) => (
                        <Star 
                          key={i + review.rating} 
                          size={16} 
                          className="star-empty" 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="review-text">{review.reviewText}</p>
                  <div className="review-sentiment">
                    <span className={`sentiment-badge sentiment-${review.sentiment?.label}`}>
                      {review.sentiment?.label?.toUpperCase()}
                    </span>
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="info-section">
          <div className="info-card">
            <Clock size={24} />
            <h3>Smart Dining Enabled</h3>
            <p>Your account now supports food ordering, order history, and ML-powered dish recommendations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
