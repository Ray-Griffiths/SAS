
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, fetchUserProfile } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUserFromToken = async () => {
    const token = localStorage.getItem('access_token'); // FIX: Use 'access_token'
    if (token) {
      try {
        const userProfile = await fetchUserProfile();
        const fullUser = { ...(userProfile.profile || {}), token };
        setUser(fullUser);
      } catch (error) {
        console.error("Session expired or token invalid:", error);
        localStorage.removeItem('access_token'); // FIX: Use 'access_token'
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserFromToken();
  }, []);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const userData = await apiLogin(identifier, password);
      const token = userData.access_token;
      localStorage.setItem('access_token', token); // FIX: Use 'access_token'

      const userProfile = await fetchUserProfile();
      const userWithRoles = userProfile.profile;

      const fullUser = { ...userWithRoles, token };
      setUser(fullUser);

      if (fullUser.is_admin) {
        navigate('/admin', { replace: true });
      } else if (fullUser.is_lecturer) {
        navigate('/lecturer', { replace: true });
      } else if (fullUser.is_student) {
        navigate('/student', { replace: true });
      } else {
        navigate('/', { replace: true }); // Default fallback
      }

      setLoading(false);

    } catch (error) {
      localStorage.removeItem('access_token'); // FIX: Use 'access_token'
      setUser(null);
      setLoading(false);
      throw error; // Re-throw error for the form to catch
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token'); // FIX: Use 'access_token'
    setUser(null);
    navigate('/login', { replace: true });
  };

  const authValue = {
    user,
    setUser,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={authValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
