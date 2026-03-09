import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dishAPI, reviewAPI, customerAPI } from '../utils/api';
import { Star, Send, Loader, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import './Feedback.css';

const Feedback = () => {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const customerToken = localStorage.getItem('customerToken');
  const [customer, setCustomer] = useState(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    dish: '',
    rating: 0,
    reviewText: ''
  });
  const [errors, setErrors] = useState({});
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    // Check if customer is logged in
    if (!customerToken) {
      setLoading(false);
      return;
    }
    loadDishes();
    loadCustomerData();
  }, [customerToken]);

  const loadCustomerData = async () => {
    try {
      const response = await customerAPI.getMe();
      if (response.data.success) {
        const customerData = response.data.customer;
        setCustomer(customerData);
        // Pre-populate form with customer data
        setFormData(prev => ({
          ...prev,
          customerName: customerData.name || '',
          customerEmail: customerData.email || '',
          customerPhone: customerData.phone || ''
        }));
      }
    } catch (error) {
      console.error('Failed to load customer data:', error);
    }
  };

  const handleLoginRedirect = () => {
    toast.info('Please login to give feedback');
    navigate('/customer/login');
  };

  const loadDishes = async () => {
    try {
      const response = await dishAPI.getActive();
      setDishes(response.data.data);
    } catch (error) {
      toast.error('Failed to load dishes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRating = (rating) => {
    setFormData(prev => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Name is required';
    }

    if (!formData.dish) {
      newErrors.dish = 'Please select a dish';
    }

    if (formData.rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!formData.reviewText.trim()) {
      newErrors.reviewText = 'Review is required';
    } else if (formData.reviewText.trim().length < 10) {
      newErrors.reviewText = 'Review must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await reviewAPI.create(formData);
      toast.success(response.data.message);
      
      // Reset form
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        dish: '',
        rating: 0,
        reviewText: ''
      });

      // Navigate to home after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (!customerToken) {
    return (
      <div className="feedback-page">
        <div className="container">
          <div className="login-required-section">
            <Lock size={60} className="lock-icon" />
            <h1>Login Required</h1>
            <p>You need to be logged in to give feedback on our dishes.</p>
            <button 
              onClick={handleLoginRedirect}
              className="btn btn-primary btn-lg"
            >
              Login to Give Feedback
            </button>
            <p className="signup-text">
              Don't have an account?{' '}
              <button 
                onClick={() => navigate('/customer/register')}
                className="link-button"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading dishes...</div>;
  }

  return (
    <div className="feedback-page">
      <div className="container">
        <div className="feedback-container">
          <div className="feedback-header">
            <h1>Share Your Experience</h1>
            <p>Your feedback helps us improve and serve you better</p>
          </div>

          <div className="feedback-form-card card">
            <form onSubmit={handleSubmit}>
              {/* Customer Info */}
              <div className="form-section">
                <h2>Your Information</h2>
                {customer && <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '15px' }}>Logged in as verified customer</p>}
                
                <div className="input-group">
                  <label htmlFor="customerName">Name *</label>
                  <input
                    type="text"
                    id="customerName"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    readOnly={!!customer}
                  />
                  {errors.customerName && (
                    <span className="error-message">{errors.customerName}</span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="customerEmail">Email (Optional)</label>
                  <input
                    type="email"
                    id="customerEmail"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    readOnly={!!customer}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="customerPhone">Phone (Optional)</label>
                  <input
                    type="tel"
                    id="customerPhone"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    placeholder="+91 1234567890"
                    readOnly={!!customer}
                  />
                </div>
              </div>

              {/* Dish Selection */}
              <div className="form-section">
                <h2>Select Dish</h2>
                
                <div className="input-group">
                  <label htmlFor="dish">Which dish would you like to review? *</label>
                  <select
                    id="dish"
                    name="dish"
                    value={formData.dish}
                    onChange={handleChange}
                  >
                    <option value="">-- Select a dish --</option>
                    {dishes.map(dish => (
                      <option key={dish._id} value={dish._id}>
                        {dish.name} - ₹{dish.price} ({dish.category})
                      </option>
                    ))}
                  </select>
                  {errors.dish && (
                    <span className="error-message">{errors.dish}</span>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="form-section">
                <h2>Your Rating</h2>
                
                <div className="input-group">
                  <label>How would you rate this dish? *</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star ${
                          star <= (hoveredRating || formData.rating) ? 'active' : ''
                        }`}
                        onClick={() => handleRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                      >
                        <Star
                          size={40}
                          fill={star <= (hoveredRating || formData.rating) ? '#fbbf24' : 'none'}
                          stroke="#fbbf24"
                        />
                      </button>
                    ))}
                  </div>
                  {formData.rating > 0 && (
                    <p className="rating-text">
                      You rated: {formData.rating} star{formData.rating > 1 ? 's' : ''}
                    </p>
                  )}
                  {errors.rating && (
                    <span className="error-message">{errors.rating}</span>
                  )}
                </div>
              </div>

              {/* Review Text */}
              <div className="form-section">
                <h2>Your Review</h2>
                
                <div className="input-group">
                  <label htmlFor="reviewText">Tell us about your experience *</label>
                  <textarea
                    id="reviewText"
                    name="reviewText"
                    value={formData.reviewText}
                    onChange={handleChange}
                    placeholder="Share your thoughts about the taste, presentation, service, etc..."
                    rows="5"
                  />
                  <small className="char-count">
                    {formData.reviewText.length} characters (minimum 10)
                  </small>
                  {errors.reviewText && (
                    <span className="error-message">{errors.reviewText}</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary btn-lg submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Submit Feedback
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
