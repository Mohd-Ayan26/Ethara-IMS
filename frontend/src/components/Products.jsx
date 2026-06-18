import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Products({ setGlobalError }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    sku: '',
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setError('Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      id: '',
      sku: '',
      name: '',
      description: '',
      price: '0.00',
      stock_quantity: '0',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setFormData({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock_quantity: product.stock_quantity,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent concurrent submissions

    setError('');
    setSuccess('');
    setGlobalError(''); // Clear global alert on new submit attempt

    const trimmedSku = formData.sku.trim();
    const trimmedName = formData.name.trim();
    const trimmedDesc = formData.description.trim();

    // 1. Validate SKU
    if (!trimmedSku) {
      setError('Product SKU is required.');
      return;
    }
    const skuRegex = /^[a-zA-Z0-9\-_]+$/;
    if (!skuRegex.test(trimmedSku)) {
      setError('SKU must contain only letters, numbers, hyphens, and underscores (no spaces).');
      setGlobalError('Invalid SKU character format.');
      return;
    }

    // 2. Validate Name
    if (!trimmedName) {
      setError('Product Name is required and cannot be empty.');
      return;
    }

    // 3. Validate Price
    if (formData.price === '' || isNaN(formData.price)) {
      setError('Price is required and must be a valid number.');
      return;
    }
    if (Number(formData.price) < 0) {
      setError('Price cannot be negative.');
      return;
    }

    // 4. Validate Stock
    if (formData.stock_quantity === '' || isNaN(formData.stock_quantity)) {
      setError('Stock quantity is required.');
      return;
    }
    if (Number(formData.stock_quantity) < 0 || !Number.isInteger(Number(formData.stock_quantity))) {
      setError('Stock quantity must be a non-negative integer.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        sku: trimmedSku.toUpperCase(), // Normalize SKU to uppercase
        name: trimmedName,
        description: trimmedDesc || null,
        price: Number(formData.price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
      };

      if (modalMode === 'create') {
        await api.createProduct(payload);
        setSuccess(`Product '${payload.name}' created successfully!`);
      } else {
        await api.updateProduct(formData.id, payload);
        setSuccess(`Product '${payload.name}' updated successfully!`);
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      setError(err.message || 'Operation failed.');
      // If the error message mentions "sku" or is duplicate, throw the alert above all UI
      if (err.message && err.message.toLowerCase().includes('sku')) {
        setGlobalError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete '${product.name}'?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.deleteProduct(product.id);
      setSuccess(`Product '${product.name}' deleted successfully.`);
      loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
    }
  };

  const adjustStock = async (product, delta) => {
    setError('');
    setSuccess('');
    const newStock = product.stock_quantity + delta;
    if (newStock < 0) return;

    try {
      await api.updateProduct(product.id, {
        stock_quantity: newStock
      });
      loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock.');
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(val));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage catalog items and monitor stock levels</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <span>+</span> Add Product
        </button>
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

      {/* Search and filtering */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '16px 24px' }}>
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Search products by SKU or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="glass-card">
        {loading && products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading catalog data...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            No products found matching your search.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Stock Level</th>
                  <th>Quick Adjust</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
                      {p.sku}
                    </td>
                    <td style={{ fontWeight: '600' }}>{p.name}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description || '-'}
                    </td>
                    <td style={{ fontWeight: '500' }}>{formatCurrency(p.price)}</td>
                    <td>
                      <span className={`badge ${p.stock_quantity > 5 ? 'badge-success' : 'badge-danger'}`}>
                        {p.stock_quantity} left
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => adjustStock(p, -1)}
                          disabled={p.stock_quantity === 0}
                        >
                          -
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => adjustStock(p, 5)}
                        >
                          +5
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => openEditModal(p)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => handleDelete(p)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '24px', fontSize: '20px' }}>
              {modalMode === 'create' ? 'Create New Product' : 'Edit Product Details'}
            </h2>
            
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">SKU (Stock Keeping Unit)</label>
                <input
                  type="text"
                  name="sku"
                  className="form-control"
                  placeholder="e.g. ELEC-PH-102"
                  value={formData.sku}
                  onChange={handleInputChange}
                  disabled={modalMode === 'edit'} // Lock SKU on edit
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. Wireless Charger Pad"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-control"
                  rows="3"
                  placeholder="Details and specifications..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="2500"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Stock</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    min="0"
                    className="form-control"
                    placeholder="100"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
