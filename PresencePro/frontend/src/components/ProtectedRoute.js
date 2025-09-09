import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!user) {
    // If not logged in, redirect to the login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if the user has one of the required roles
  const hasRequiredRole = roles.some(role => {
    if (role === 'admin') return user.is_admin;
    if (role === 'lecturer') return user.is_lecturer;
    if (role === 'student') return user.is_student;
    return false;
  });

  if (!hasRequiredRole) {
    // If the user does not have the required role, redirect to a fallback page
    // Redirecting to login might cause a loop if they are already logged in.
    return <Navigate to="/" replace />; // Or to an 'unauthorized' page
  }

  return children;
}

export default ProtectedRoute;
