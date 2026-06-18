import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Customers({ setGlobalError }) {
  const [customers, setCustomers] = useState([]);
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
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError('Failed to fetch customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
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
      name: '',
      email: '',
      phone: '',
      address: '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setModalMode('edit');
    setFormData({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submits

    setError('');
    setSuccess('');
    setGlobalError(''); // Clear global alert on new submit attempt

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedAddress = formData.address.trim();

    // 1. Validate Name
    if (!trimmedName) {
      setError('Customer Name is required and cannot be empty.');
      return;
    }

    // 2. Validate Email
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. user@example.com).');
      setGlobalError('Invalid email address format.');
      return;
    }

    // 3. Validate Mobile Number (Exactly 10 digits if provided)
    if (trimmedPhone) {
      const digits = trimmedPhone.replace(/\D/g, '');
      if (digits.length !== 10) {
        setError('Mobile number must be exactly 10 digits (excluding spaces, hyphens, and formatting).');
        setGlobalError('Mobile number must be exactly 10 digits.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone ? trimmedPhone.replace(/\D/g, '') : null, // Clean formatting for database consistency
        address: trimmedAddress || null,
      };

      if (modalMode === 'create') {
        await api.createCustomer(payload);
        setSuccess(`Customer '${payload.name}' added successfully!`);
      } else {
        await api.updateCustomer(formData.id, payload);
        setSuccess(`Customer '${payload.name}' updated successfully!`);
      }

      setIsModalOpen(false);
      loadCustomers();
    } catch (err) {
      setError(err.message || 'Operation failed.');
      // If the error message mentions "email" or is duplicate, throw the alert above all UI
      if (err.message && err.message.toLowerCase().includes('email')) {
        setGlobalError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Are you sure you want to remove customer '${customer.name}'?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.deleteCustomer(customer.id);
      setSuccess(`Customer '${customer.name}' removed successfully.`);
      loadCustomers();
    } catch (err) {
      setError(err.message || 'Failed to remove customer.');
    }
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customer directory and contact information</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <span>+</span> Add Customer
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
              placeholder="Search customers by Name or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="glass-card">
        {loading && customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading customer directory...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            No customers found matching your search.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>Delivery Address</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '600' }}>{c.name}</td>
                    <td style={{ color: 'var(--color-secondary)', fontWeight: '500' }}>{c.email}</td>
                    <td>{c.phone || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.address || '-'}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-dark)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => openEditModal(c)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => handleDelete(c)}
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
              {modalMode === 'create' ? 'Add New Customer' : 'Edit Customer Info'}
            </h2>
            
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="e.g. jane.doe@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  placeholder="e.g. +1 (555) 123-4567"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Address</label>
                <textarea
                  name="address"
                  className="form-control"
                  rows="3"
                  placeholder="Street address, City, State, ZIP..."
                  value={formData.address}
                  onChange={handleInputChange}
                />
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Add Customer' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
