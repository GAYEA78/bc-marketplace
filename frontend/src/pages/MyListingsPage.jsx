import React, { useState, useEffect } from 'react';
import './MyListingsPage.css';
import { normalizeImg } from '../utils/imageUrl';
const apiBase = import.meta.env.VITE_API_BASE_URL;

function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const fetchMyListings = async () => {
      if (!token) { setError("You must be logged in to view your listings."); setLoading(false); return; }
      try {
        const res = await fetch(`${apiBase}/users/me/listings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Could not fetch your listings.');
        setListings(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMyListings();
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      const res = await fetch(`${apiBase}/listings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete listing.');
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      alert(e.message);
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
          listings.map((l) => {
            const displayImage =
              l.main_image_url || l.image_url_1 || l.image_url_2 || l.image_url_3 || l.image_url_4;

            return (
              <div key={l.id} className="my-listing-card">
                {displayImage && (
                  <img
                    src={normalizeImg(displayImage)}       
                    alt={l.title}
                    className="my-listing-card-image"
                    onError={(e) => {
                      console.error('Image failed to load:', e.currentTarget.src);
                      e.currentTarget.src = 'https://placehold.co/600x400?text=No+Image';
                    }}
                  />
                )}
                <div className="my-listing-card-content">
                  <h3>{l.title}</h3>
                  <p className="my-listing-price">${l.price.toFixed(2)}</p>
                  <button onClick={() => handleDelete(l.id)} className="delete-button">Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MyListingsPage;
