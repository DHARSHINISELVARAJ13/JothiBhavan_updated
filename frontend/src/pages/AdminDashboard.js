import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
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
  const [hoveredSentiment, setHoveredSentiment] = useState('negative');

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

  const { summary, sentiment, ratingDistribution, recentReviews } = dashboardData;

  // Prepare data for charts
  const sentimentChartData = [
    { key: 'positive', name: 'Positive', value: sentiment.breakdown.positive, color: '#10b981' },
    { key: 'neutral', name: 'Neutral', value: sentiment.breakdown.neutral, color: '#f59e0b' },
    { key: 'negative', name: 'Negative', value: sentiment.breakdown.negative, color: '#ef4444' }
  ];

  const sentimentDishContributors = dashboardData.sentimentDishContributors || {
    positive: [],
    neutral: [],
    negative: []
  };

  const activeSentiment = hoveredSentiment || 'negative';
  const activeSentimentLabel = activeSentiment.charAt(0).toUpperCase() + activeSentiment.slice(1);
  const activeContributors = sentimentDishContributors[activeSentiment] || [];

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
                  onMouseEnter={(_, index) => {
                    const selected = sentimentChartData[index];
                    if (selected?.key) {
                      setHoveredSentiment(selected.key);
                    }
                  }}
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

            <div className="sentiment-hover-insights">
              <h3>
                Top Foods in {activeSentimentLabel} Sentiment
                <span className={`insight-sentiment-tag ${activeSentiment}`}>{activeSentimentLabel}</span>
              </h3>
              <p className="hover-hint">Hover a slice in the pie chart to switch sentiment details.</p>

              {activeContributors.length > 0 ? (
                <ul className="sentiment-food-list">
                  {activeContributors.map((item, index) => (
                    <li key={`${activeSentiment}-${item.dishId || item.dishName}-${index}`} className="sentiment-food-item">
                      <span className="food-rank">#{index + 1}</span>
                      <span className="food-name">{item.dishName}</span>
                      <span className="food-meta">
                        {item.reviewCount} {activeSentimentLabel.toLowerCase()} out of {item.totalDishReviews || item.reviewCount} total ({item.percentageOfSentiment}% of {activeSentimentLabel.toLowerCase()})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-data no-data-small">No dish-level contributors available for this sentiment in the selected range.</p>
              )}
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