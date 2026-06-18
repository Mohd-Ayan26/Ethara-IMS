import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState({
    total_products: 0,
    total_customers: 0,
    total_orders: 0,
    low_stock_products_count: 0,
    total_revenue: 0,
  });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const statsData = await api.getStats();
        setStats(statsData);

        const productsData = await api.getProducts();
        setProducts(productsData);

        const ordersData = await api.getOrders();
        setOrders(ordersData);
      } catch (err) {
        setError('Failed to fetch dashboard data. Make sure backend is running.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(val));
  };

  const lowStockItems = products.filter(p => p.stock_quantity <= 5);
  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--text-muted)' }}>
          Loading dashboard metrics...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of inventory activity and metrics</p>
        </div>
      </div>

      {error && (
        <div className="alert-banner danger">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid-cols-4">
        <div className="glass-card stats-card" style={{ borderLeft: '3px solid var(--color-primary)' }}>
          <div className="stats-info">
            <h4>Products</h4>
            <div className="stats-value">{stats.total_products}</div>
          </div>
          <div className="stats-icon indigo">📦</div>
        </div>

        <div className="glass-card stats-card" style={{ borderLeft: '3px solid var(--color-secondary)' }}>
          <div className="stats-info">
            <h4>Customers</h4>
            <div className="stats-value">{stats.total_customers}</div>
          </div>
          <div className="stats-icon cyan">👥</div>
        </div>

        <div className="glass-card stats-card" style={{ borderLeft: '3px solid var(--color-accent)' }}>
          <div className="stats-info">
            <h4>Orders Placed</h4>
            <div className="stats-value">{stats.total_orders}</div>
          </div>
          <div className="stats-icon indigo" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>🛒</div>
        </div>

        <div className="glass-card stats-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
          <div className="stats-info">
            <h4>Revenue</h4>
            <div className="stats-value">{formatCurrency(stats.total_revenue)}</div>
          </div>
          <div className="stats-icon emerald">💰</div>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* Low Stock Alerts */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--color-danger)' }}>⚠️</span> Low Stock Alerts
            </h3>
            <span className="badge badge-danger">{lowStockItems.length} items</span>
          </div>

          {lowStockItems.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
              All products have sufficient stock levels.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {lowStockItems.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="badge badge-danger" style={{ fontWeight: 'bold' }}>{p.stock_quantity} left</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px', cursor: 'pointer' }} onClick={() => setActiveTab('products')}>
                      Replenish →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Recent Orders
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => setActiveTab('orders')}>
              View all →
            </span>
          </div>

          {recentOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
              No orders placed yet.
            </p>
          ) : (
            <div className="recent-orders-list">
              {recentOrders.map(order => (
                <div key={order.id} className="recent-order-item" onClick={() => setActiveTab('orders')}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Order #{order.id.substring(0, 8)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.customer_name || 'Customer'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{formatCurrency(order.total_amount)}</div>
                    <div style={{ marginTop: '4px' }}>
                      <span className={`badge ${order.status === 'confirmed' ? 'badge-success' : order.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
