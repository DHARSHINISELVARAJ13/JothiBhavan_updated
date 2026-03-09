import React, { useState, useEffect } from 'react';
import { dishAPI } from '../utils/api';
import { Plus, Edit, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'react-toastify';
import './DishManagement.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const DishManagement = () => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Main Course',
    price: '',
    imageUrl: '',
    tags: '',
    isAvailable: true
  });

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    try {
      setLoading(true);
      const response = await dishAPI.getAll();
      setDishes(response.data.data);
    } catch (error) {
      toast.error('Failed to load dishes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (dish = null) => {
    if (dish) {
      setEditingDish(dish);
      setFormData({
        name: dish.name,
        description: dish.description,
        category: dish.category,
        price: dish.price,
        imageUrl: dish.imageUrl || '',
        tags: dish.tags.join(', '),
        isAvailable: dish.isAvailable
      });
    } else {
      setEditingDish(null);
      setFormData({
        name: '',
        description: '',
        category: 'Main Course',
        price: '',
        imageUrl: '',
        tags: '',
        isAvailable: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDish(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `${API_BASE_URL}${url}`;
    return url;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataPayload = new FormData();
    formDataPayload.append('image', file);

    try {
      setUploading(true);
      const response = await dishAPI.uploadImage(formDataPayload);
      const imageUrl = response.data.data.imageUrl;
      setFormData(prev => ({
        ...prev,
        imageUrl
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const dishData = {
      ...formData,
      price: parseFloat(formData.price),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    try {
      if (editingDish) {
        await dishAPI.update(editingDish._id, dishData);
        toast.success('Dish updated successfully');
      } else {
        await dishAPI.create(dishData);
        toast.success('Dish created successfully');
      }
      loadDishes();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleToggleStatus = async (dish) => {
    try {
      await dishAPI.toggle(dish._id);
      toast.success(`Dish ${!dish.isActive ? 'activated' : 'deactivated'}`);
      loadDishes();
    } catch (error) {
      toast.error('Failed to toggle dish status');
    }
  };

  const handleDelete = async (dish) => {
    if (!window.confirm(`Are you sure you want to delete "${dish.name}"?`)) {
      return;
    }

    try {
      await dishAPI.delete(dish._id);
      toast.success('Dish deleted successfully');
      loadDishes();
    } catch (error) {
      toast.error('Failed to delete dish');
    }
  };

  if (loading) {
    return <div className="loading">Loading dishes...</div>;
  }

  return (
    <div className="dish-management">
      <div className="container">
        <div className="page-header">
          <h1>Dish Management</h1>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} />
            Add New Dish
          </button>
        </div>

        <div className="dishes-grid">
          {dishes.map(dish => (
            <div key={dish._id} className={`dish-card card ${!dish.isActive ? 'inactive' : ''}`}>
              {dish.imageUrl && (
                <div className="dish-card-image">
                  <img src={resolveImageUrl(dish.imageUrl)} alt={dish.name} />
                </div>
              )}
              <div className="dish-card-header">
                <div className="dish-status">
                  {dish.isActive ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-danger">Inactive</span>
                  )}
                  {dish.isAvailable ? (
                    <span className="badge badge-info">Available</span>
                  ) : (
                    <span className="badge badge-warning">Unavailable</span>
                  )}
                </div>
                <span className="dish-category">{dish.category}</span>
              </div>

              <div className="dish-card-body">
                <h3>{dish.name}</h3>
                <p className="dish-description">{dish.description}</p>
                <div className="dish-price">₹{dish.price}</div>
                {dish.tags.length > 0 && (
                  <div className="dish-tags">
                    {dish.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="dish-card-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleToggleStatus(dish)}
                  title={dish.isActive ? 'Deactivate' : 'Activate'}
                >
                  {dish.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleOpenModal(dish)}
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button
                  className="btn-icon danger"
                  onClick={() => handleDelete(dish)}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {dishes.length === 0 && (
          <div className="no-data card">
            <p>No dishes found. Add your first dish to get started!</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDish ? 'Edit Dish' : 'Add New Dish'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="input-group">
                <label htmlFor="name">Dish Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="Appetizer">Appetizer</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Snack">Snack</option>
                    <option value="Special">Special</option>
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="price">Price (₹) *</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="imageUpload">Dish Image (Upload)</label>
                <input
                  type="file"
                  id="imageUpload"
                  name="imageUpload"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <p className="upload-hint">Uploading image...</p>}
              </div>

              <div className="input-group">
                <label htmlFor="imageUrl">Or Image URL (Optional)</label>
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {formData.imageUrl && (
                <div className="image-preview">
                  <img src={resolveImageUrl(formData.imageUrl)} alt="Preview" />
                </div>
              )}

              <div className="input-group">
                <label htmlFor="tags">Tags (comma separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="vegetarian, spicy, popular"
                />
              </div>

              <div className="input-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isAvailable"
                    checked={formData.isAvailable}
                    onChange={handleChange}
                  />
                  Available for ordering
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDish ? 'Update Dish' : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DishManagement;
