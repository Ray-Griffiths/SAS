import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function ProtectedRoute({ element }) {
  const { user, loading } = useAuth(); // Use the useAuth hook
  const location = useLocation();

  // While loading, you might render a spinner or null
  if (loading) {
    return null; // Or a loading indicator
  }

  // Check if the user is authenticated
  const isAuthenticated = !!user; // isAuthenticated is true if user is not null

  // You can add role-based checks here if needed
  // For example, to only allow admins to access '/admin'
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLecturerRoute = location.pathname.startsWith('/lecturer');
  const isStudentRoute = location.pathname.startsWith('/student');

  if (isAuthenticated) {
    // If authenticated, check for role-based access
    if (isAdminRoute && (user.role === 'admin' || user.is_admin)) {
      return element; // Allow access to admin route if user is admin
    }
    if (isLecturerRoute && user.role === 'lecturer') {
         return element; // Allow access to lecturer route if user is lecturer
    }
    if (isStudentRoute && user.role === 'student') {
         return element; // Allow access to student route if user is student
    }

  } else {
    // If not authenticated, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
}

export default ProtectedRoute;