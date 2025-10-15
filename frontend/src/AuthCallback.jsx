import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Get the token from the URL query parameters
    const token = searchParams.get('token');

    if (token) {
      // Store the token in the browser's local storage
      localStorage.setItem('authToken', token);
      // Redirect the user to the homepage
      navigate('/');
    } else {
      // If no token is found, redirect to homepage anyway
      // (will add error handling later)
      navigate('/');
    }
  }, [searchParams, navigate]);

  return (
    <div>
      <p>Logging you in...</p>
    </div>
  );
}

export default AuthCallback;