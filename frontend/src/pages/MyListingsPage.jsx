import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MyListingsPage.css';

function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const fetchMyListings = async () => {
      if (!token) {
        setError("You must be logged in to view your listings.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch('http://127.0.0.1:8000/users/me/listings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Could not fetch your listings.');
        const data = await response.json();
        setListings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMyListings();
  }, [token]);

  const handleDelete = async (listingId) => {
    if (!window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/listings/${listingId}`, {
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

  if (loading) return <div className="spinner container"></div>;
  if (error) return <p className="error-message container">{error}</p>;

  return (
    <div className="container">
      <h1>My Listings</h1>
      <div className="my-listings-grid">
        {listings.length === 0 ? (
          <p>You have not posted any listings yet.</p>
        ) : (
          listings.map(listing => (
            <div key={listing.id} className="my-listing-card">
              <img 
                src={`http://127.0.0.1:8000${listing.main_image_url || listing.image_url_1}`} 
                alt={listing.title} 
                className="my-listing-card-image" 
              />
              <div className="my-listing-card-content">
                <h3>{listing.title}</h3>
                <p className="my-listing-price">${listing.price.toFixed(2)}</p>
                <button onClick={() => handleDelete(listing.id)} className="delete-button">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyListingsPage;