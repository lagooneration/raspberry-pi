import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for session in localStorage
    const savedSession = localStorage.getItem('session');
    const savedUser = localStorage.getItem('user');

    if (savedSession && savedUser) {
      try {
        setSessionId(savedSession);
        setCurrentUser(JSON.parse(savedUser));
        
        // Validate the session
        validateSession(savedSession);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        logout();
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateSession = async (sid) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/validate-session', { session_id: sid });
      
      if (response.data.valid) {
        setCurrentUser(response.data.user);
        setSessionId(sid);
      } else {
        // Session is invalid or expired
        logout();
      }
    } catch (error) {
      console.error('Session validation error:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.post('/auth/login', { username, password });
      
      if (response.data.user && response.data.session) {
        setCurrentUser(response.data.user);
        setSessionId(response.data.session.id);
        
        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('session', response.data.session.id);
        
        return response.data;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Failed to login');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cloudAuth = async (token) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.post('/auth/cloud-auth', { token });
      
      if (response.data.user && response.data.session) {
        setCurrentUser(response.data.user);
        setSessionId(response.data.session.id);
        
        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('session', response.data.session.id);
        
        return response.data;
      }
    } catch (error) {
      console.error('Cloud auth error:', error);
      setError(error.response?.data?.error || 'Failed to authenticate');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (sessionId) {
        await api.post('/auth/logout', { session_id: sessionId });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state and localStorage
      setCurrentUser(null);
      setSessionId(null);
      localStorage.removeItem('user');
      localStorage.removeItem('session');
    }
  };

  const value = {
    currentUser,
    sessionId,
    isLoading,
    error,
    isAuthenticated: !!currentUser,
    login,
    cloudAuth,
    logout,
    validateSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 