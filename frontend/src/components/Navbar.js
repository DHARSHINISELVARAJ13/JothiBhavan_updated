import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const { admin, logout } = useAuth();
  const customerToken = localStorage.getItem('customerToken');
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isCustomerRoute = location.pathname.startsWith('/customer');

  const handleCustomerLogout = () => {
    localStorage.removeItem('customerToken');
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">🍽️</span>
            <span className="brand-name">Jothi Bavan</span>
          </Link>

          <div className="navbar-links">
            {isCustomerRoute ? (
              customerToken ? (
                <>
                  <Link to="/customer/dashboard" className="nav-link">My Dashboard</Link>
                  <Link to="/my-orders" className="nav-link">My Orders</Link>
                  <Link to="/menu" className="nav-link">View Menu</Link>
                  <Link to="/feedback" className="nav-link">Give Feedback</Link>
                  <button onClick={handleCustomerLogout} className="btn btn-secondary btn-sm">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/" className="nav-link">Home</Link>
                  <Link to="/" className="nav-link">View Menu</Link>
                  <Link to="/feedback" className="nav-link">Give Feedback</Link>
                  <Link to="/customer/login" className="btn btn-primary btn-sm">
                    Customer Login
                  </Link>
                </>
              )
            ) : isAdminRoute ? (
              admin ? (
                <>
                  <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
                  <Link to="/admin/dishes" className="nav-link">Dishes</Link>
                  <Link to="/admin/reviews" className="nav-link">Reviews</Link>
                  <Link to="/admin/orders" className="nav-link">Orders</Link>
                  <button onClick={logout} className="btn btn-secondary btn-sm">
                    Admin Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/" className="nav-link">Home</Link>
                  <Link to="/admin/login" className="btn btn-secondary btn-sm">
                    Admin Login
                  </Link>
                </>
              )
            ) : customerToken ? (
              <>
                <Link to="/customer/dashboard" className="nav-link">My Dashboard</Link>
                <Link to="/my-orders" className="nav-link">My Orders</Link>
                <Link to="/menu" className="nav-link">View Menu</Link>
                <Link to="/feedback" className="nav-link">Give Feedback</Link>
                <button onClick={handleCustomerLogout} className="btn btn-secondary btn-sm">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/" className="nav-link">Home</Link>
                <Link to="/#menu-section" className="nav-link">View Menu</Link>
                <Link to="/feedback" className="nav-link">Give Feedback</Link>
                <Link to="/customer/login" className="btn btn-primary btn-sm">
                  Customer Login
                </Link>
                <Link to="/admin/login" className="btn btn-secondary btn-sm">
                  Admin Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
