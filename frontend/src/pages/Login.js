import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const { login, cloudAuth, isAuthenticated, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Extract token from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      setToken(urlToken);
      setTabValue(1); // Switch to cloud auth tab
      
      // Auto authenticate if token is present
      handleCloudAuth(urlToken);
    }
  }, [location]);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    try {
      setLoginLoading(true);
      await login(username, password);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCloudAuth = async (providedToken = null) => {
    const authToken = providedToken || token;
    if (!authToken) return;
    
    try {
      setLoginLoading(true);
      await cloudAuth(authToken);
      navigate('/');
    } catch (error) {
      console.error('Cloud auth failed:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            EndustryAI Scale
          </Typography>
          <Typography component="h2" variant="h6" align="center" color="textSecondary" gutterBottom>
            Weight Scale System
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box sx={{ width: '100%', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} centered>
              <Tab label="Local Login" />
              <Tab label="Cloud Token" />
            </Tabs>
          </Box>
          
          {tabValue === 0 ? (
            <Box component="form" onSubmit={handleLocalLogin} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loginLoading}
              >
                {loginLoading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="textSecondary" paragraph>
                Enter the token provided by the cloud dashboard to authenticate:
              </Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                id="token"
                label="Authentication Token"
                name="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={() => handleCloudAuth()}
                disabled={loginLoading || !token}
              >
                {loginLoading ? <CircularProgress size={24} /> : 'Authenticate'}
              </Button>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              This is a local instance of EndustryAI Scale.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Device ID can be found in Settings.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login; 