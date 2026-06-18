import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode state: 'list' | 'create'
  const [viewMode, setViewMode] = useState('list');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New Order Form State
  const [orderCustomer, setOrderCustomer] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: 1, availableStock: 0, price: 0 }
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ordersData = await api.getOrders();
      setOrders(ordersData);

      const productsData = await api.getProducts();
      setProducts(productsData);

      const customersData = await api.getCustomers();
      setCustomers(customersData);
    } catch (err) {
      setError('Failed to load system data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(val));
  };

  // Status adjustment helper
  const handleStatusChange = async (orderId, newStatus) => {
    setError('');
    setSuccess('');
    try {
      await api.updateOrderStatus(orderId, newStatus);
      setSuccess(`Order status updated to '${newStatus}'`);
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        // Refresh details modal too
        const updated = await api.getOrder(orderId);
        setSelectedOrder(updated);
      }
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
    }
  };

  // Order Items logic
  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, availableStock: 0, price: 0 }]);
  };

  const handleRemoveItemRow = (index) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const handleItemProductChange = (index, productId) => {
    const updated = [...orderItems];
    const product = products.find(p => p.id === productId);
    
    if (product) {
      updated[index].product_id = productId;
      updated[index].availableStock = product.stock_quantity;
      updated[index].price = Number(product.price);
    } else {
      updated[index].product_id = '';
      updated[index].availableStock = 0;
      updated[index].price = 0;
    }
    
    setOrderItems(updated);
  };

  const handleItemQuantityChange = (index, qty) => {
    const updated = [...orderItems];
    updated[index].quantity = Math.max(1, parseInt(qty, 10) || 1);
    setOrderItems(updated);
  };

  // Check if form is valid and stock is available
  const isStockSufficient = () => {
    if (!orderCustomer) return false;
    if (orderItems.length === 0) return false;
    
    for (const item of orderItems) {
      if (!item.product_id) return false;
      if (item.quantity > item.availableStock) return false;
    }
    
    return true;
  };

  // Calculate Running Total
  const calculateOrderTotal = () => {
    return orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submissions

    setError('');
    setSuccess('');

    if (!isStockSufficient()) {
      setError('Cannot place order. Ensure all products are selected and quantities do not exceed available stock.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customer_id: orderCustomer,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      };

      await api.createOrder(payload);
      setSuccess('Order placed successfully! Stock reduced.');
      
      // Reset form
      setOrderCustomer('');
      setOrderItems([{ product_id: '', quantity: 1, availableStock: 0, price: 0 }]);
      setViewMode('list');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Track orders, inspect line items, and register new checkouts</p>
        </div>
        {viewMode === 'list' ? (
          <button className="btn btn-primary" onClick={() => setViewMode('create')}>
            <span>🛒</span> Place New Order
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
            ← Back to List
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner danger">
          <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div className="alert-banner success">
          <span>✅</span> {success}
        </div>
      )}

      {/* VIEW 1: ORDERS LIST */}
      {viewMode === 'list' && (
        <div className="glass-card">
          {loading && orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Loading order history...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No orders have been recorded in the system yet.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date Placed</th>
                    <th>Status</th>
                    <th>Total Price</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        #{o.id.substring(0, 8)}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{o.customer_name || 'Removed Customer'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{o.customer_email}</div>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${o.status === 'confirmed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', fontFamily: 'var(--font-heading)', fontSize: '15px' }}>
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => setSelectedOrder(o)}
                          >
                            👁️ View Details
                          </button>
                          {o.status !== 'cancelled' ? (
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '13px' }}
                              onClick={() => handleStatusChange(o.id, 'cancelled')}
                            >
                              🛑 Cancel
                            </button>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '13px', borderColor: 'var(--color-success)', color: '#34d399' }}
                              onClick={() => handleStatusChange(o.id, 'confirmed')}
                            >
                              🔄 Re-confirm
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PLACE NEW ORDER */}
      {viewMode === 'create' && (
        <form onSubmit={handlePlaceOrderSubmit}>
          <div className="order-creation-panel">
            {/* Left Hand: Items Builder */}
            <div className="glass-card order-items-builder">
              <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📦</span> Select Products & Quantities
              </h2>

              {orderItems.map((item, index) => {
                const isOverStock = item.product_id && item.quantity > item.availableStock;
                return (
                  <div key={index} className="order-item-row" style={{ borderColor: isOverStock ? 'var(--color-danger)' : 'var(--border-color)' }}>
                    <div style={{ flex: 2 }}>
                      <label className="form-label" style={{ fontSize: '10px' }}>Product SKU / Name</label>
                      <select
                        className="form-control"
                        value={item.product_id}
                        onChange={(e) => handleItemProductChange(index, e.target.value)}
                        required
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} | {p.name} (₹{p.price}) - [In Stock: {p.stock_quantity}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1, maxWidth: '120px' }}>
                      <label className="form-label" style={{ fontSize: '10px' }}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={item.quantity}
                        onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                        disabled={!item.product_id}
                        required
                      />
                    </div>

                    <div style={{ flex: 1, textAlign: 'right', paddingRight: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Price</div>
                      <div style={{ fontWeight: '600' }}>
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '8px 12px', marginTop: '16px' }}
                      onClick={() => handleRemoveItemRow(index)}
                      disabled={orderItems.length === 1}
                    >
                      ✕
                    </button>

                    {isOverStock && (
                      <div style={{ flexBasis: '100%', color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
                        ⚠️ Out of stock! Max available: {item.availableStock}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '12px' }}
                onClick={handleAddItemRow}
              >
                + Add Another Product
              </button>
            </div>

            {/* Right Hand: Checkout Summary Sidebar */}
            <div className="glass-card order-summary-sidebar">
              <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Order Checkout</h2>

              <div className="form-group">
                <label className="form-label">Customer Email</label>
                <select
                  className="form-control"
                  value={orderCustomer}
                  onChange={(e) => setOrderCustomer(e.target.value)}
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <p style={{ color: 'var(--color-warning)', fontSize: '12px', marginTop: '6px' }}>
                    No customers registered yet. Create a customer first!
                  </p>
                )}
              </div>

              <div style={{ margin: '24px 0', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>Items Count:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {orderItems.length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>Grand Total:</span>
                  <span style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--color-secondary)' }}>
                    {formatCurrency(calculateOrderTotal())}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
                disabled={!isStockSufficient() || isSubmitting}
              >
                {isSubmitting ? 'Processing Order...' : '💳 Place Order & Lock Stock'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* DETAIL MODAL DRAWER */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px' }}>Order Details</h2>
              <span className={`badge ${selectedOrder.status === 'confirmed' ? 'badge-success' : selectedOrder.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                {selectedOrder.status}
              </span>
            </div>

            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Order Number
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '15px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                {selectedOrder.id}
              </div>

              <div className="grid-cols-2" style={{ marginTop: '16px', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CUSTOMER</div>
                  <div style={{ fontWeight: '600' }}>{selectedOrder.customer_name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedOrder.customer_email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DATE PLACED</div>
                  <div style={{ fontWeight: '500' }}>
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>Ordered Items</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {selectedOrder.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.product_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      SKU: <span style={{ fontFamily: 'monospace' }}>{item.product_sku}</span> | Unit Price: {formatCurrency(item.unit_price)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>Qty: {item.quantity}</div>
                    <div style={{ fontWeight: '600', color: 'var(--color-secondary)', marginTop: '2px' }}>
                      {formatCurrency(item.unit_price * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '24px' }}>
              <span style={{ fontWeight: '600' }}>Total Paid:</span>
              <span style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--color-secondary)' }}>
                {formatCurrency(selectedOrder.total_amount)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {selectedOrder.status !== 'cancelled' ? (
                <button
                  className="btn btn-danger"
                  onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')}
                >
                  🛑 Cancel Order & Restock
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleStatusChange(selectedOrder.id, 'confirmed')}
                >
                  🔄 Re-confirm & Lock Stock
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
