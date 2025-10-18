import React, { useState } from 'react';
import './CreateListing.css';

const categories = ["Textbooks", "Furniture", "Electronics", "Tickets", "Other"];

function CreateListing({ onListingCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 4);
    setImages(files);
    
    imagePreviews.forEach(url => URL.revokeObjectURL(url));

    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
    setMainImageIndex(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) {
      setMessage("Please upload at least one image.");
      return;
    }
    setMessage('');
    setIsSubmitting(true);

    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('main_image_index', mainImageIndex);
    images.forEach(image => {
      formData.append('files', image);
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/listings`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create listing.');
      }

      const newListing = await response.json();
      setMessage(`Success! Your listing has been created.`);
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory(categories[0]);
      setImages([]);
      setImagePreviews([]);
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
    <div className="create-listing-form">
      <h2>Create a New Listing</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="images">Images (Click a preview to select main image)</label>
          <input id="images" type="file" multiple accept="image/png, image/jpeg" onChange={handleImageChange} required />
          <div className="image-previews">
            {imagePreviews.map((preview, index) => (
              <img
                key={index}
                src={preview}
                alt={`Preview ${index + 1}`}
                className={index === mainImageIndex ? 'preview-image selected' : 'preview-image'}
                onClick={() => setMainImageIndex(index)}
              />
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Mini Fridge" required />
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Good condition, used for one year" rows="3" />
        </div>

        <div className="form-group">
          <label htmlFor="price">Price</label>
          <input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$" step="0.01" min="0" required />
        </div>
        
        <button type="submit" className="btn-form-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Posting...' : 'Post Listing'}
        </button>
      </form>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default CreateListing;