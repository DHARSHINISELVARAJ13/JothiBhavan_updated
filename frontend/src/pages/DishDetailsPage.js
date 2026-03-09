import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { dishAPI } from '../utils/api';
import { getDishImageSrc, getDishFallbackImage } from '../utils/dishImage';
import './CustomerExperience.css';

const DishDetailsPage = () => {
  const { dishId } = useParams();
  const navigate = useNavigate();

  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDish = async () => {
      try {
        const response = await dishAPI.getById(dishId);
        setDish(response.data?.data || null);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load dish details');
      } finally {
        setLoading(false);
      }
    };

    loadDish();
  }, [dishId]);

  if (loading) {
    return <div className="loading">Loading dish details...</div>;
  }

  if (!dish) {
    return (
      <div className="customer-experience-page">
        <div className="container">
          <div className="card empty-state-card">
            <p>Dish not found.</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/menu')}>
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-experience-page">
      <div className="container">
        <div className="dish-details-card card">
          <img
            className="dish-details-image"
            src={getDishImageSrc(dish)}
            alt={dish.name}
            onError={(event) => {
              event.currentTarget.src = getDishFallbackImage(dish.name, dish.category);
            }}
          />
          <p className="section-overline">Dish Details</p>
          <h1>{dish.name}</h1>
          <p className="dish-meta">{dish.category} • ₹{dish.price}</p>
          <p className="dish-description">{dish.description || 'No description available.'}</p>

          <div className="action-row">
            <button
              type="button"
              className="btn btn-success"
              onClick={() => navigate(`/customer/orders?dishId=${dish._id}&view=cart`)}
            >
              Add to Cart
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/review/${dish._id}`)}
            >
              Review This Dish
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/menu')}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DishDetailsPage;
