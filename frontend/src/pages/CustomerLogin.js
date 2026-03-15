import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { customerAPI } from '../utils/api';
import '../styles/CustomerLogin.css';
import { LogIn } from 'lucide-react';

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (token) {
      navigate('/customer/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await customerAPI.login({
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        // Store token
        const token = response.data.token;
        localStorage.setItem('customerToken', token);
        toast.success('Login successful!');
        
        // Ensure token is stored before navigating
        setTimeout(() => {
          navigate('/customer/dashboard');
        }, 100);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <LogIn size={40} className="login-icon" />
            <h1>Customer Login</h1>
            <p>Access your personalized dining profile</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary btn-login"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="login-footer">
            <p>Don't have an account? <Link to="/customer/register">Register here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
