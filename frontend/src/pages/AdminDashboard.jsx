import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    document.title = 'Admin Dashboard - BC Marketplace';

    const fetchData = async (url, setter) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Failed to fetch from ${url}`);
        const data = await response.json();
        setter(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData('/admin/users', setUsers);
    fetchData('/admin/reports', setListings); // For now, this gets all listings
  }, [token]);

  const handleDelete = async (listingId) => {
    if (!window.confirm("ADMIN ACTION: Are you sure you want to permanently delete this listing?")) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/listings/${listingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to delete listing.');
      }
      
      setListings(prevListings => prevListings.filter(listing => listing.id !== listingId));

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>
      
      <div className="admin-section">
        <h2>All Users ({users.length})</h2>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.bc_email}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="admin-section">
        <h2>All Listings ({listings.length})</h2>
        <div className="table-container">
          <table className="admin-table">
             <thead>
              <tr>
                <th>Title</th>
                <th>Price</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map(listing => (
                <tr key={listing.id}>
                  <td>{listing.title}</td>
                  <td>${listing.price.toFixed(2)}</td>
                  <td>{listing.category}</td>
                  <td>
                    <button onClick={() => handleDelete(listing.id)} className="btn-delete-admin">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;