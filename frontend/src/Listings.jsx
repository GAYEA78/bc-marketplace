import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { normalizeImg } from './utils/imageUrl';

const categories = ["All Products", "Textbooks", "Furniture", "Electronics", "Tickets", "Other"];

const gridContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 50 },
  show: { opacity: 1, y: 0 }
};

function Listings({ onListingCreated, onListingClick }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (filterCategory) params.append('category', filterCategory);
      const qs = params.toString();
      const url = `${import.meta.env.VITE_API_BASE_URL}/listings${qs ? `?${qs}` : ''}`;
      

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

    const debounceFetch = setTimeout(() => {
      fetchListings();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [searchQuery, filterCategory, onListingCreated]);

  return (
    <div>
      <div className="actions-bar">
        <div className="filter-controls">
          <input
            type="text"
            placeholder="Search for items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat === "All Products" ? "" : cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="spinner"></div>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && (
        <motion.div
          className="listings-grid"
          variants={gridContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {listings.length === 0 ? (
            <div className="empty-state">
              <h3>No Listings Found</h3>
              <p>Try adjusting your search or be the first to post!</p>
            </div>
          ) : (
            listings.map((listing) => (
              <motion.div
                key={listing.id}
                className="listing-card"
                onClick={() => onListingClick(listing.id)}
                variants={gridItemVariants}
              >
                {(() => {
                  const displayImage =
                    listing.main_image_url ||
                    listing.image_url_1 ||
                    listing.image_url_2 ||
                    listing.image_url_3 ||
                    listing.image_url_4;

                  if (!displayImage) return null;

                  return (
                    <img
                      src={normalizeImg(displayImage)}
                      alt={listing.title}
                      className="listing-card-image"
                      onError={(e) => {
                        console.error('Image failed to load:', e.currentTarget.src);
                        e.currentTarget.src = 'https://placehold.co/600x400?text=No+Image';
                      }}
                    />
                  );
                })()}

                <div className="listing-card-content">
                  <h3>{listing.title}</h3>
                  <p className="card-details">
                    {listing.description || 'No description available.'}
                  </p>
                  <div className="card-footer">
                    <p className="listing-price">${listing.price.toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}

export default Listings;
