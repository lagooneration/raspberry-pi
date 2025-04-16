import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import WeighTicketList from './pages/weighTickets/WeighTicketList';
import WeighTicketForm from './pages/weighTickets/WeighTicketForm';
import WeighingOperation from './pages/weighTickets/WeighingOperation';
import Settings from './pages/Settings';

// Components
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              
              <Route path="customers">
                <Route index element={<CustomerList />} />
                <Route path="new" element={<CustomerForm />} />
                <Route path=":id" element={<CustomerForm />} />
              </Route>
              
              <Route path="weigh-tickets">
                <Route index element={<WeighTicketList />} />
                <Route path="new" element={<WeighTicketForm />} />
                <Route path=":id" element={<WeighTicketForm />} />
              </Route>
              
              <Route path="weighing" element={<WeighingOperation />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 