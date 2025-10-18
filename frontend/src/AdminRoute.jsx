import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const useAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      const fetchUser = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Auth check failed');
          const user = await response.json();
          setIsAdmin(user.is_admin);
        } catch (e) {
          setIsAdmin(false);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, isAdmin };
};

const AdminRoute = () => {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <div className="spinner container"></div>;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/" />;
};

export default AdminRoute;