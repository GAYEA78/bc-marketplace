import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import AuthCallback from './AuthCallback';
import CreateListing from './CreateListing';
import Listings from './Listings';
import MessagesPage from './pages/MessagesPage';
import ThreadPage from './pages/ThreadPage';
import './App.css';
import logo from './assets/bc_marketplace_logo.png';

const GoogleIcon = () => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);

function Header({ token, onLogout, onPostListingClick }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSignIn = () => {
    window.location.href = 'http://127.0.0.1:8000/auth/google/login';
  };

  return (
    <header className={isScrolled ? "app-header scrolled" : "app-header"}>
      <div className="container header-content">
        <div className="header-logo-container">
          <Link to="/">
            <img src={logo} alt="BC Marketplace Logo" className="header-logo" />
          </Link>
        </div>
        <div className="logo">
          <h1><Link to="/" className="logo-link">BC Marketplace</Link></h1>
        </div>
        <nav className="header-nav">
          {token ? (
            <>
              <Link to="/messages" className="btn btn-secondary">Messages</Link>
              <button onClick={onPostListingClick} className="btn btn-gold">Post Listing</button>
              <button onClick={onLogout} className="btn btn-secondary">Sign Out</button>
            </>
          ) : (
            <button onClick={handleSignIn} className="btn btn-gold">
              <GoogleIcon /> Login
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function ListingDetailModal({ listingId, closeModal }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    if (!listingId) return;
    const fetchListing = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/listings/${listingId}`);
        if (!response.ok) throw new Error('Listing not found');
        const data = await response.json();
        setListing(data);
        setSelectedImage(data.main_image_url || data.image_url_1);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [listingId]);

  const handleMessageSeller = async () => {
    if (!token) {
      alert("Please log in to message a seller.");
      return;
    }
    try {
      const response = await fetch(`http://127.0.0.1:8000/threads/${listingId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Could not start conversation.');
      }
      const thread = await response.json();
      navigate(`/thread/${thread.id}`);
      closeModal();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const galleryImages = listing ? [listing.image_url_1, listing.image_url_2, listing.image_url_3, listing.image_url_4].filter(Boolean) : [];

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={closeModal}>&times;</button>
        {loading ? <div className="spinner"></div> : (
          listing && (
            <div>
              {selectedImage && <img src={`http://127.0.0.1:8000${selectedImage}`} alt={listing.title} className="modal-main-image" />}
              
              <div className="modal-thumbnail-gallery">
                {galleryImages.map((url, index) => (
                  <img 
                    key={index} 
                    src={`http://127.0.0.1:8000${url}`} 
                    alt={`${listing.title} thumbnail ${index + 1}`}
                    className={url === selectedImage ? 'thumbnail selected' : 'thumbnail'}
                    onClick={() => setSelectedImage(url)}
                  />
                ))}
              </div>

              <h2>{listing.title}</h2>
              <p className="listing-price-modal">${listing.price.toFixed(2)}</p>
              <p className="listing-category-modal">{listing.category}</p>
              <p>{listing.description}</p>
              <div className="seller-info">
                <img src={listing.owner.photo_url} alt={listing.owner.name} className="owner-avatar-modal" />
                <div>
                  <p><strong>Seller:</strong> {listing.owner.name}</p>
                  <p><em>Verified @bc.edu email</em></p>
                </div>
              </div>
              <button className="btn btn-primary-modal" onClick={handleMessageSeller}>Message Seller</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function HomePage({ onListingCreated, onListingClick }) {
  return (
    <div className="container">
      <Listings
        onListingCreated={onListingCreated}
        onListingClick={onListingClick}
      />
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const handleLogin = (tok) => {
    localStorage.setItem('authToken', tok);
    setToken(tok);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  const handleListingCreated = () => {
    setIsCreateModalOpen(false);
    setUpdateTrigger(prev => prev + 1);
  };

  return (
    <Router>
      <div className="app-wrapper">
        <Header token={token} onLogout={handleLogout} onPostListingClick={() => setIsCreateModalOpen(true)} />
        <main>
          <Routes>
            <Route path="/" element={
              <HomePage
                key={updateTrigger}
                onListingCreated={handleListingCreated}
                onListingClick={setSelectedListingId}
              />
            } />
            <Route path="/auth/callback" element={<AuthCallback onLogin={handleLogin} />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/thread/:threadId" element={<ThreadPage />} />
          </Routes>
        </main>
        {isCreateModalOpen && (
          <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <CreateListing onListingCreated={handleListingCreated} />
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>&times;</button>
            </div>
          </div>
        )}
        {selectedListingId && (
          <ListingDetailModal listingId={selectedListingId} closeModal={() => setSelectedListingId(null)} />
        )}
      </div>
    </Router>
  );
}

export default App;