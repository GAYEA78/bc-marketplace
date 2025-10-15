import React, { useState } from 'react';

const categories = ["Textbooks", "Furniture", "Electronics", "Tickets", "Other"];

function CreateListing({ onListingCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage('You must be logged in to create a listing.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title,
          description: description,
          price: parseFloat(price),
          category: category
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create listing.');
      }

      const newListing = await response.json();
      setMessage(`Success! Listing "${newListing.title}" created.`);
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory(categories[0]);
      if (onListingCreated) {
        onListingCreated(newListing);
      }

    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-container create-listing-form">
      <h2>Create a New Listing</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g., Mini Fridge)"
            required
          />
        </div>
        <div className="form-group">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="form-group">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (e.g., Good condition, used for one year)"
            rows="3"
          />
        </div>
        <div className="form-group">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price ($)"
            step="0.01"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Posting...' : 'Post Listing'}
        </button>
      </form>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default CreateListing;
