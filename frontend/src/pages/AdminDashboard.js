import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Star, MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

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

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboard({ timeRange });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!dashboardData) {
    return <div className="loading">No data available</div>;
  }

  const { summary, sentiment, ratingDistribution, topRatedDishes, mostNegativeFeedback, recentReviews } = dashboardData;

  // Prepare data for charts
  const sentimentChartData = [
    { name: 'Positive', value: sentiment.breakdown.positive, color: '#10b981' },
    { name: 'Neutral', value: sentiment.breakdown.neutral, color: '#f59e0b' },
    { name: 'Negative', value: sentiment.breakdown.negative, color: '#ef4444' }
  ];

  const ratingChartData = Object.entries(ratingDistribution).map(([rating, count]) => ({
    rating: `${rating} ⭐`,
    count
  }));

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Dashboard Analytics</h1>
          <div className="time-filter">
            <label>Time Range:</label>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="stats-grid">
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: '#dbeafe' }}>
              <MessageSquare size={32} color="#3b82f6" />
            </div>
            <div className="stat-content">
              <h3>Total Reviews (All Time)</h3>
              <p className="stat-value">{summary.totalReviews}</p>
              <small style={{ color: '#6b7280' }}>
                In selected range: {summary.totalReviewsInRange ?? 0}
              </small>
            </div>
          </div>

          <div className="stat-card card">
            <div className="stat-icon" style={{ background: '#d1fae5' }}>
              <Star size={32} color="#10b981" />
            </div>
            <div className="stat-content">
              <h3>Average Rating</h3>
              <p className="stat-value">{summary.averageRating} / 5</p>
            </div>
          </div>

          <div className="stat-card card">
            <div className="stat-icon" style={{ background: '#dcfce7' }}>
              <ThumbsUp size={32} color="#22c55e" />
            </div>
            <div className="stat-content">
              <h3>Positive Feedback</h3>
              <p className="stat-value">{sentiment.percentages.positive}%</p>
            </div>
          </div>

          <div className="stat-card card">
            <div className="stat-icon" style={{ background: '#fee2e2' }}>
              <ThumbsDown size={32} color="#ef4444" />
            </div>
            <div className="stat-content">
              <h3>Negative Feedback</h3>
              <p className="stat-value">{sentiment.percentages.negative}%</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Sentiment Distribution */}
          <div className="chart-card card">
            <h2>Sentiment Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="sentiment-legend">
              <div className="legend-item">
                <span className="legend-dot positive"></span>
                <span>Positive: {sentiment.breakdown.positive}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot neutral"></span>
                <span>Neutral: {sentiment.breakdown.neutral}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot negative"></span>
                <span>Negative: {sentiment.breakdown.negative}</span>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="chart-card card">
            <h2>Rating Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Rated Dishes */}
        <div className="insights-grid">
          <div className="insight-card card">
            <div className="insight-header">
              <h2>
                <TrendingUp size={24} color="#10b981" />
                Top Rated Dishes
              </h2>
            </div>
            {topRatedDishes && topRatedDishes.length > 0 ? (
              <div className="dish-list">
                {topRatedDishes.map((item, index) => (
                  item?.dish ? (
                    <div key={index} className="dish-item">
                      <div className="dish-rank">#{index + 1}</div>
                      <div className="dish-info">
                        <h4>{item.dish.name}</h4>
                        <p className="dish-category">{item.dish.category}</p>
                      </div>
                      <div className="dish-stats">
                        <span className="dish-rating">
                          <Star size={16} fill="#fbbf24" color="#fbbf24" />
                          {item.avgRating}
                        </span>
                        <span className="dish-reviews">{item.reviewCount} reviews</span>
                        <span className="dish-positive">{item.positivePercentage}% positive</span>
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
            ) : (
              <p className="no-data">No reviews yet. Dishes need at least 3 reviews to appear here.</p>
            )}
          </div>

          {/* Most Negative Feedback */}
          <div className="insight-card card">
            <div className="insight-header">
              <h2>
                <TrendingDown size={24} color="#ef4444" />
                Needs Improvement
              </h2>
            </div>
            {mostNegativeFeedback && mostNegativeFeedback.length > 0 ? (
              <div className="dish-list">
                {mostNegativeFeedback.map((item, index) => (
                  item?.dish ? (
                    <div key={index} className="dish-item negative">
                      <div className="dish-rank alert">#{index + 1}</div>
                      <div className="dish-info">
                        <h4>{item.dish.name}</h4>
                        <p className="dish-category">{item.dish.category}</p>
                      </div>
                      <div className="dish-stats">
                        <span className="dish-rating warning">
                          <Star size={16} color="#ef4444" />
                          {item.avgRating}
                        </span>
                        <span className="dish-negative">{item.negativeCount} negative</span>
                        <span className="dish-negative">{item.negativePercentage}% negative</span>
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
            ) : (
              <p className="no-data">Great! No dishes with negative feedback.</p>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="recent-reviews-section card">
          <h2>Recent Reviews</h2>
          {recentReviews && recentReviews.length > 0 ? (
            <div className="reviews-list">
              {recentReviews.slice(0, 5).map((review) => {
                const dishName = review.dish?.name || review.dishName || extractDishNameFromReview(review.reviewText);
                return (
                  <div key={review._id} className="review-item">
                    <div className="review-header-row">
                      <div className="review-customer">
                        <strong>{review.customerName}</strong>
                        <span className="review-dish">reviewed {dishName}</span>
                      </div>
                      <div className="review-meta">
                        <span className="review-rating">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < review.rating ? '#fbbf24' : 'none'}
                              color="#fbbf24"
                            />
                          ))}
                        </span>
                        <span className={`sentiment-badge ${review.sentiment.label}`}>
                          {review.sentiment.label === 'positive' && <ThumbsUp size={14} />}
                          {review.sentiment.label === 'negative' && <ThumbsDown size={14} />}
                          {review.sentiment.label === 'neutral' && <Minus size={14} />}
                          {review.sentiment.label}
                        </span>
                      </div>
                    </div>
                    <p className="review-text">{review.reviewText}</p>
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-data">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;