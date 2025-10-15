import React, { useState, useEffect } from 'react';

const categories = ["Textbooks", "Furniture", "Electronics", "Tickets", "Other"];

function Listings({ openModal }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (filterCategory) params.append('category', filterCategory);
      const url = `http://127.0.0.1:8000/listings?${params.toString()}`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Data could not be fetched.');
        const data = await response.json();
        setListings(data);
        setError(null);
      } catch (error) {
        setError(error.message);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [searchQuery, filterCategory]);

  return (
    <div>
        <div className="actions-bar">
            <div className="filter-controls">
                <input
                    type="text"
                    placeholder="Search for items or categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            {token && (
                <button className="btn btn-primary" onClick={openModal}>
                    Post a New Listing
                </button>
            )}
        </div>

        {loading && <div className="spinner"></div>}
        {error && <p className="error-message">Error: {error}</p>}
        
        {!loading && !error && (
            <div className="listings-grid">
                {listings.length === 0 ? (
                    <div className="empty-state">
                        <h3>No Listings Found</h3>
                        <p>Try adjusting your search or be the first to post!</p>
                    </div>
                ) : (
                    listings.map((listing) => (
                        <div key={listing.id} className="listing-card">
                            <div className="card-header">
                                <h3>{listing.title}</h3>
                                <p className="listing-price">${listing.price.toFixed(2)}</p>
                            </div>
                            <p className="listing-category">{listing.category}</p>
                            <p className="card-description">{listing.description}</p>
                            <div className="card-footer">
                                <img src={listing.owner.photo_url} alt={listing.owner.name} className="owner-avatar" />
                                <span>{listing.owner.name}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}
    </div>
  );
}

export default Listings;