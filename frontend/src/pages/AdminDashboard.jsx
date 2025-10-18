import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const token = localStorage.getItem('authToken');

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchListings = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch listings');
      const data = await response.json();
      setListings(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    document.title = 'Admin Dashboard - BC Marketplace';
    fetchUsers();
    fetchListings();
  }, [token]);

  const handleBan = async (userId) => {
    if (!window.confirm("Are you sure you want to ban this user? They will not be able to log in or re-register with this email.")) {
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to ban user.');
      fetchUsers();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUnban = async (userId) => {
    if (!window.confirm("Are you sure you want to unban this user? They will be able to log in again.")) {
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to unban user.');
      fetchUsers();
    } catch (error) {
      alert(error.message);
    }
  };
  
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? Their email will be banned.")) {
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete user.');
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("ADMIN ACTION: Are you sure you want to permanently delete this listing?")) {
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/listings/${listingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete listing.');
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
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={user.is_banned ? 'banned-row' : ''}>
                  <td>{user.name}</td>
                  <td>{user.bc_email}</td>
                  <td>{user.is_banned ? 'Banned' : 'Active'}</td>
                  <td className="actions-cell">
                    {user.is_banned ? (
                      <button onClick={() => handleUnban(user.id)} className="btn-unban-admin">Unban</button>
                    ) : (
                      <button onClick={() => handleBan(user.id)} className="btn-ban-admin">Ban</button>
                    )}
                    <button onClick={() => handleDeleteUser(user.id)} className="btn-delete-admin">Delete</button>
                  </td>
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
                    <button onClick={() => handleDeleteListing(listing.id)} className="btn-delete-admin">
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