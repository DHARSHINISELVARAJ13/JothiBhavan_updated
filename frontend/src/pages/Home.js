import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { settingsAPI, dishAPI, reviewAPI } from '../utils/api';
import { getDishImageSrc, getDishFallbackImage } from '../utils/dishImage';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [publicReviews, setPublicReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const foodSlides = [
    // {
    //   image: 'https://images.unsplash.com/photo-1565557623814-dea706bbd4cd?w=1200&h=500&fit=crop&q=80',
    //   title: 'Authentic South Indian Cuisine'
    // },
    {
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=500&fit=crop&q=80',
      title: 'Fresh & Delicious Dishes'
    },
    {
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&h=500&fit=crop&q=80',
      title: 'Culinary Excellence'
    }
  ];

  useEffect(() => {
    loadSettings();
    // Auto-rotate carousel every 5 seconds
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % foodSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const loadSettings = async () => {
    try {
      const [settingsResponse, dishesResponse, reviewsResponse] = await Promise.all([
        settingsAPI.get(),
        dishAPI.getActive(),
        reviewAPI.getPublic({ limit: 8 })
      ]);

      setSettings(settingsResponse.data.data);
      setDishes(dishesResponse.data.data || []);
      setPublicReviews(reviewsResponse.data.data || []);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % foodSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + foodSlides.length) % foodSlides.length);
  const handleDishClick = (dishId) => {
    navigate(`/dish/${dishId}`);
  };

  return (
    <div className="home-page">
      {/* Hero Section with Carousel */}
      <section className="hero-section">
        <div className="hero-carousel">
          {foodSlides.map((slide, index) => (
            <div
              key={index}
              className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="carousel-overlay"></div>
            </div>
          ))}
          
          {/* Carousel Controls */}
          <button className="carousel-btn carousel-prev" onClick={prevSlide} aria-label="Previous slide">
            <ChevronLeft size={32} />
          </button>
          <button className="carousel-btn carousel-next" onClick={nextSlide} aria-label="Next slide">
            <ChevronRight size={32} />
          </button>
          
          {/* Carousel Indicators */}
          <div className="carousel-indicators">
            {foodSlides.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              ></button>
            ))}
          </div>
        </div>

        <div className="container">
          <div className="hero-content fade-in">
            <h1 className="hero-title">{settings?.hotelName || 'Jothi Bavan'}</h1>
            <p className="hero-tagline">{settings?.tagline}</p>
            <p className="hero-description">{settings?.description}</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="menu-section" className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose Us</h2>
          <div className="features-grid">
            {settings?.features?.map((feature, index) => (
              <div key={index} className="feature-card card fade-in">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Our Menu</h2>
          <div className="features-grid">
            {dishes.length > 0 ? (
              dishes.slice(0, 12).map((dish) => (
                <div
                  key={dish._id}
                  className="feature-card card fade-in"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleDishClick(dish._id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleDishClick(dish._id);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    className="menu-card-image"
                    src={getDishImageSrc(dish)}
                    alt={dish.name}
                    onError={(event) => {
                      event.currentTarget.src = getDishFallbackImage(dish.name, dish.category);
                    }}
                  />
                  <div className="feature-title" style={{ marginBottom: '8px' }}>{dish.name}</div>
                  <p className="feature-description" style={{ marginBottom: '8px' }}>{dish.description}</p>
                  <p className="feature-description"><strong>{dish.category}</strong> • ₹{dish.price}</p>
                  <p className="feature-description" style={{ marginTop: '10px', fontWeight: 600 }}>Click to order</p>
                </div>
              ))
            ) : (
              <p>No dishes available currently.</p>
            )}
          </div>
        </div>
      </section>

      {/* Public Reviews Section */}
      <section className="contact-section">
        <div className="container">
          <div className="contact-card card">
            <h2 className="section-title">What Our Customers Say</h2>
            {publicReviews.length > 0 ? (
              <div className="features-grid">
                {publicReviews.map((review) => (
                  <div key={review._id} className="feature-card card fade-in">
                    <h3 className="feature-title">{review.customerName}</h3>
                    <p className="feature-description" style={{ marginBottom: '8px' }}>
                      {review.dish?.name || review.dishName}
                    </p>
                    <p className="feature-description" style={{ marginBottom: '8px' }}>
                      {'⭐'.repeat(review.rating)}
                    </p>
                    <p className="feature-description">{review.reviewText}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No public reviews available yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      {settings?.contactInfo && (
        <section className="contact-section">
          <div className="container">
            <div className="contact-card card">
              <h2 className="section-title">Visit Us</h2>
              <div className="contact-grid">
                <div className="contact-item">
                  <h3>📍 Address</h3>
                  <p>{settings.contactInfo.address}</p>
                  <p>{settings.contactInfo.city}, {settings.contactInfo.state}</p>
                  <p>{settings.contactInfo.pincode}</p>
                </div>
                <div className="contact-item">
                  <h3>📞 Contact</h3>
                  <p>Phone: {settings.contactInfo.phone}</p>
                </div>
                {settings.businessHours && (
                  <div className="contact-item">
                    <h3>🕐 Hours</h3>
                    <p>Mon - Sun</p>
                    <p>{settings.businessHours.monday?.open} - {settings.businessHours.monday?.close}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Share Your Experience</h2>
            <p>Your feedback helps us serve you better</p>
            <Link to="/feedback" className="btn btn-primary btn-lg">
              <Star size={20} />
              Write a Review
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
