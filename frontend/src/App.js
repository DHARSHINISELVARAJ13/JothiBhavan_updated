import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';

// Pages
import Home from './pages/Home';
import Feedback from './pages/Feedback';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import DishManagement from './pages/DishManagement';
import ReviewManagement from './pages/ReviewManagement';
import CustomerRegister from './pages/CustomerRegister';
import CustomerLogin from './pages/CustomerLogin';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerOrders from './pages/CustomerOrders';
import AdminOrderManagement from './pages/AdminOrderManagement';
import MenuPage from './pages/MenuPage';
import DishDetailsPage from './pages/DishDetailsPage';
import MyOrdersPage from './pages/MyOrdersPage';
import DishReviewPage from './pages/DishReviewPage';

// Protected Route Component for Admin
const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/admin/login" />;
};

// Protected Route Component for Customer
const CustomerProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('customerToken');
  
  if (!token) {
    return <Navigate to="/customer/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/feedback" element={<Feedback />} />

        {/* Customer Routes - PUBLIC registration/login */}
        <Route path="/customer/register" element={<CustomerRegister />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        
        {/* Customer Routes - PROTECTED dashboard */}
        <Route
          path="/customer/dashboard"
          element={
            <CustomerProtectedRoute>
              <CustomerDashboard />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="/customer/orders"
          element={
            <CustomerProtectedRoute>
              <CustomerOrders />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <CustomerProtectedRoute>
              <MenuPage />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="/dish/:dishId"
          element={
            <CustomerProtectedRoute>
              <DishDetailsPage />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <CustomerProtectedRoute>
              <MyOrdersPage />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="/review/:dishId"
          element={
            <CustomerProtectedRoute>
              <DishReviewPage />
            </CustomerProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/dishes"
          element={
            <AdminProtectedRoute>
              <DishManagement />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminProtectedRoute>
              <ReviewManagement />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminProtectedRoute>
              <AdminOrderManagement />
            </AdminProtectedRoute>
          }
        />
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
