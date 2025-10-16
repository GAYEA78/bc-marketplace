import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function AuthCallback({ onLogin }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      onLogin(token);
      navigate('/');
    } else {
      navigate('/');
    }
  }, [onLogin, searchParams, navigate]);

  return (
    <div className="container">
      <p>Logging in...</p>
    </div>
  );
}

export default AuthCallback;