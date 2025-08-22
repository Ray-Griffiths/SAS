import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, fetchUserProfile, logoutApi } from '../services/api'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const loadUserFromToken = async () => {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        try {
          // Fetch user profile using the token from localStorage via interceptor
          const userData = await fetchUserProfile(token); 
          setUser({ ...userData.profile, token });
        } catch (error) {
          console.error('Error loading user from token:', error);
          localStorage.removeItem('jwt_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUserFromToken();
  }, []);

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    try {
      const userData = await apiLogin(username, password);
      const token = userData.access_token;

      localStorage.setItem('jwt_token', token);
      // Fetch user profile using the token from localStorage via interceptor
      const userProfile = await fetchUserProfile();
      setUser({ ...userProfile.profile, token });

      // Redirect based on role after successful login
      if (userProfile.profile && userProfile.profile.is_admin) {
        console.log("User is admin, navigating to /admin/dashboard"); // Log before navigate
        navigate('/admin/dashboard');
        console.log("Navigation call made for admin"); // Log after navigate
      } else if (userProfile.profile && userProfile.profile.role === 'lecturer') {
        console.log("User is lecturer, navigating to /lecturer");
        navigate('/lecturer');
        console.log("Navigation call made for lecturer");
      } else if (userProfile.profile && userProfile.profile.role === 'student') {
         console.log("User is student, navigating to /student");
         navigate('/student');
         console.log("Navigation call made for student");
      } else {
         console.log("User role not recognized, navigating to /");
         navigate('/');
         console.log("Navigation call made for unknown role");
      }

      setLoading(false);
      return userProfile;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Error during backend logout:', error);
    }
    localStorage.removeItem('jwt_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
