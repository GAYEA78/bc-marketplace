import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import AuthCallback from './AuthCallback';
import CreateListing from './CreateListing';
import Listings from './Listings';
import MessagesPage from './pages/MessagesPage';
import ThreadPage from './pages/ThreadPage';
import './App.css';
import logo from './assets/bc_marketplace_logo.png';
import MyListingsPage from './pages/MyListingsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './AdminRoute';

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
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google/login`;
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
              <Link to="/my-listings" className="btn btn-secondary">My Listings</Link>
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

function ListingDetailModal({ listingId, closeModal, setReportingListingId }) {
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
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/listings/${listingId}`);
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/threads/${listingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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

  const galleryImages = listing
    ? [listing.image_url_1, listing.image_url_2, listing.image_url_3, listing.image_url_4].filter(Boolean)
    : [];

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={closeModal}>&times;</button>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          listing && (
            <div>
              {selectedImage && (
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL}${selectedImage}`}
                  alt={listing.title}
                  className="modal-main-image"
                />
              )}

              <div className="modal-thumbnail-gallery">
                {galleryImages.map((url, index) => (
                  <img
                    key={index}
                    src={`${import.meta.env.VITE_API_BASE_URL}${url}`}
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
                <svg
                  className="owner-avatar-modal"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20z" />
                </svg>
                <div>
                  <p><em>Seller is a verified @bc.edu email</em></p>
                </div>
              </div>

              <button className="btn btn-primary-modal" onClick={handleMessageSeller}>
                Message Seller
              </button>

              <button
                className="btn-report"
                onClick={() => {
                  setReportingListingId(listingId);
                  closeModal(); // Close listing modal before opening report modal
                }}
              >
                Report this listing
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ReportModal({ listingId, closeModal }) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const token = localStorage.getItem('authToken');

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    if (!token) {
      setMessage('Please log in to report a listing.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/listings/${listingId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(errText || 'Failed to submit report. Please try again.');
      }

      setSubmitted(true);
      setMessage('Report submitted successfully. An admin will review it shortly. Thank you.');
      setReason('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={!submitted ? closeModal : undefined}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={closeModal}>&times;</button>

        {!submitted ? (
          <>
            <h2>Report Listing</h2>
            <form onSubmit={handleSubmitReport} className="report-form">
              <p>Please provide a reason for reporting this listing.</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., scam..."
                rows="5"
                required
                disabled={isSubmitting}
              />
              <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
              {message && <p className="form-message">{message}</p>}
            </form>
          </>
        ) : (
          <>
            <h2>Report Submitted</h2>
            <p className="form-message">{message}</p>
            <button className="btn btn-primary-modal" onClick={closeModal}>Close</button>
          </>
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
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [reportingListingId, setReportingListingId] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setCurrentUser(null);
        return;
      }
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/users/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.status === 403){
          handleLogout();
          return;
        }
                  
        
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    };
    fetchCurrentUser();
  }, [token]);

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
    setUpdateTrigger((prev) => prev + 1);
  };

  return (
    <Router>
      <div className="app-wrapper">
        <Header
          token={token}
          onLogout={handleLogout}
          onPostListingClick={() => setIsCreateModalOpen(true)}
          currentUser={currentUser}
        />

        <main>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  key={updateTrigger}
                  onListingCreated={handleListingCreated}
                  onListingClick={setSelectedListingId}
                />
              }
            />
            <Route path="/auth/callback" element={<AuthCallback onLogin={handleLogin} />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/thread/:threadId" element={<ThreadPage />} />
            <Route path="/my-listings" element={<MyListingsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </main>

        {isCreateModalOpen && (
          <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <CreateListing onListingCreated={handleListingCreated} />
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                &times;
              </button>
            </div>
          </div>
        )}

        {selectedListingId && (
          <ListingDetailModal
            listingId={selectedListingId}
            closeModal={() => setSelectedListingId(null)}
            setReportingListingId={setReportingListingId}
          />
        )}

        {reportingListingId && (
          <ReportModal
            listingId={reportingListingId}
            closeModal={() => setReportingListingId(null)}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
