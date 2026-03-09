import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { dishAPI } from '../utils/api';
import { getDishImageSrc, getDishFallbackImage } from '../utils/dishImage';
import './CustomerExperience.css';

const MenuPage = () => {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDishes = async () => {
      try {
        const response = await dishAPI.getActive();
        setDishes(response.data?.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    loadDishes();
  }, []);

  if (loading) {
    return <div className="loading">Loading menu...</div>;
  }

  return (
    <div className="customer-experience-page">
      <div className="container">
        <div className="page-header-block">
          <h1>Menu</h1>
          <p>Choose a dish to view details and continue ordering</p>
        </div>

        {dishes.length === 0 ? (
          <div className="card empty-state-card">No dishes available currently.</div>
        ) : (
          <div className="menu-grid">
            {dishes.map((dish) => (
              <button
                key={dish._id}
                type="button"
                className="dish-card"
                onClick={() => navigate(`/dish/${dish._id}`)}
              >
                <img
                  className="dish-card-image"
                  src={getDishImageSrc(dish)}
                  alt={dish.name}
                  onError={(event) => {
                    event.currentTarget.src = getDishFallbackImage(dish.name, dish.category);
                  }}
                />
                <h3>{dish.name}</h3>
                <p>{dish.category}</p>
                <strong>₹{dish.price}</strong>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPage;
