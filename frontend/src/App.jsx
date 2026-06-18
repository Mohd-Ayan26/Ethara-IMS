import React, { useState, useEffect } from 'react';
import { api } from './api';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Orders from './components/Orders';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiConnected, setApiConnected] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');

  // Check backend health
  useEffect(() => {
    async function checkHealth() {
      try {
        setHealthLoading(true);
        const data = await api.getHealth();
        if (data && data.status === 'healthy') {
          setApiConnected(true);
        } else {
          setApiConnected(false);
        }
      } catch (err) {
        setApiConnected(false);
      } finally {
        setHealthLoading(false);
      }
    }
    
    checkHealth();
    // Poll health status every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} setGlobalError={setGlobalError} />;
      case 'products':
        return <Products setGlobalError={setGlobalError} />;
      case 'customers':
        return <Customers setGlobalError={setGlobalError} />;
      case 'orders':
        return <Orders setGlobalError={setGlobalError} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} setGlobalError={setGlobalError} />;
    }
  };

  return (
    <div className="app-container">
      {/* Global Alert for Already Exist Email / Constraints */}
      {globalError && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          padding: '16px 28px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontWeight: '600',
          fontSize: '14px',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          animation: 'slideUp 0.2s ease-out',
          maxWidth: '90%',
          width: 'max-content'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span>{globalError}</span>
          <button
            onClick={() => setGlobalError('')}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '16px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
          >
            ✕
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">E</div>
          <span className="logo-text">Ethara IMS</span>
        </div>

        <nav className="nav-links">
          <div
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-item-text">Dashboard</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <span className="nav-icon">📦</span>
            <span className="nav-item-text">Products</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-item-text">Customers</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span className="nav-icon">🛒</span>
            <span className="nav-item-text">Orders</span>
          </div>
        </nav>

        {/* API Health Indicator */}
        <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: healthLoading ? '#f59e0b' : apiConnected ? 'var(--color-success)' : 'var(--color-danger)',
              boxShadow: healthLoading ? '0 0 8px #f59e0b' : apiConnected ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            }}
          />
          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600' }}>API Status</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {healthLoading ? 'checking...' : apiConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="sidebar-footer">
          <div>IMS Client v1.0</div>
          <div>© {new Date().getFullYear()} Ethara</div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {renderActiveComponent()}
      </main>
    </div>
  );
}
