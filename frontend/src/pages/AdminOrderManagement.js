import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { orderAPI } from '../utils/api';
import './AdminOrderManagement.css';

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

const AdminOrderManagement = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [filters, setFilters] = useState({ status: '', date: '' });

  const loadData = useCallback(async (page = pagination.page) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.date ? { date: filters.date } : {})
      };

      const [ordersRes, statsRes] = await Promise.all([
        orderAPI.getAllOrders(params),
        orderAPI.getOrderStats()
      ]);

      const orderData = ordersRes.data?.data || {};
      setOrders(orderData.orders || []);
      setPagination({
        page: orderData.page || 1,
        pages: orderData.pages || 1,
        total: orderData.total || 0,
        limit: orderData.limit || 20
      });
      setStats(statsRes.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters.date, filters.status, pagination.limit, pagination.page]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const updateStatus = async (orderId, nextStatus) => {
    try {
      const response = await orderAPI.updateOrderStatus(orderId, { status: nextStatus });
      toast.success(response.data?.message || 'Order status updated');
      await loadData(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const applyFilters = () => {
    loadData(1);
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  const mostRevenueCustomer = stats?.customerInsights?.mostRevenueCustomer;
  const mostOrdersCustomer = stats?.customerInsights?.mostOrdersCustomer;

  return (
    <div className="admin-order-page">
      <div className="container">
        <div className="page-header">
          <h1>Order Management</h1>
          <p>Track all orders and update delivery workflow</p>
        </div>

        {stats && (
          <div className="stats-grid">
            <div className="card stat-card">
              <h3>Total Orders</h3>
              <p>{stats.totalOrders}</p>
            </div>
            <div className="card stat-card">
              <h3>Total Revenue</h3>
              <p>₹{Number(stats.totalRevenue || 0).toFixed(2)}</p>
            </div>
            <div className="card stat-card">
              <h3>Average Order</h3>
              <p>₹{Number(stats.averageOrderValue || 0).toFixed(2)}</p>
            </div>
            <div className="card stat-card">
              <h3>Delivered</h3>
              <p>{stats.ordersByStatus?.delivered || 0}</p>
            </div>
          </div>
        )}

        <div className="card filters-row">
          <div className="input-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="input-group">
            <label>Date</label>
            <input type="date" value={filters.date} onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))} />
          </div>

          <button className="btn btn-primary" onClick={applyFilters}>Apply</button>
        </div>

        <div className="order-insights-grid">
          <div className="card order-insight-card">
            <h3>Most Revenue Generated Customer</h3>
            {mostRevenueCustomer ? (
              <>
                <p className="insight-name">{mostRevenueCustomer.name}</p>
                <p className="insight-subtext">{mostRevenueCustomer.email || '-'}</p>
                <p className="insight-metric">₹{Number(mostRevenueCustomer.totalRevenue || 0).toFixed(2)}</p>
              </>
            ) : (
              <p className="insight-empty">No order data available</p>
            )}
          </div>

          <div className="card order-insight-card">
            <h3>Most Orders Customer</h3>
            {mostOrdersCustomer ? (
              <>
                <p className="insight-name">{mostOrdersCustomer.name}</p>
                <p className="insight-subtext">{mostOrdersCustomer.email || '-'}</p>
                <p className="insight-metric">{mostOrdersCustomer.totalOrders} orders</p>
              </>
            ) : (
              <p className="insight-empty">No order data available</p>
            )}
          </div>
        </div>

        <div className="card table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <strong>#{order._id.slice(-6).toUpperCase()}</strong>
                    <p>{new Date(order.createdAt).toLocaleString()}</p>
                  </td>
                  <td>
                    <strong>{order.customerName || order.customerId?.name}</strong>
                    <p>{order.customerEmail || order.customerId?.email}</p>
                  </td>
                  <td>{order.items?.length || 0}</td>
                  <td>₹{Number(order.totalAmount || 0).toFixed(2)}</td>
                  <td><span className={`status-pill status-${order.status}`}>{order.status}</span></td>
                  <td>
                    {STATUS_FLOW[order.status]?.length > 0 ? (
                      <select onChange={(e) => e.target.value && updateStatus(order._id, e.target.value)} defaultValue="">
                        <option value="" disabled>Select</option>
                        {STATUS_FLOW[order.status].map((status) => (
                          <option key={`${order._id}-${status}`} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && <p className="empty-text">No orders found for selected filters.</p>}
        </div>

        <div className="pagination-row">
          <button
            className="btn btn-secondary"
            disabled={pagination.page <= 1}
            onClick={() => loadData(pagination.page - 1)}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.pages} • {pagination.total} orders</span>
          <button
            className="btn btn-secondary"
            disabled={pagination.page >= pagination.pages}
            onClick={() => loadData(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderManagement;
