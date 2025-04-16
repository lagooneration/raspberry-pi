import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  TextField,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Snackbar
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { settingsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Settings() {
  const { currentUser } = useAuth();
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDeviceId();
  }, []);

  const fetchDeviceId = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await settingsApi.getDeviceId();
      setDeviceId(response.data.deviceId);
    } catch (error) {
      console.error('Error fetching device ID:', error);
      setError('Failed to load device ID');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
  };

  const handleCloseCopyAlert = () => {
    setCopied(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Device Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Error</AlertTitle>
                {error}
              </Alert>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Device ID
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      value={deviceId}
                      fullWidth
                      variant="outlined"
                      size="small"
                      InputProps={{
                        readOnly: true,
                      }}
                      sx={{ mr: 1 }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<CopyIcon />}
                      onClick={copyToClipboard}
                    >
                      Copy
                    </Button>
                  </Box>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    This is the unique identifier for this Pi scale. Use it to register in the cloud dashboard.
                  </Typography>
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  Application Version
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  1.0.0
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  System Information
                </Typography>
                <Typography variant="body2">
                  EndustryAI Weight Scale System
                </Typography>
              </>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Username
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {currentUser?.username || 'Cloud User'}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Name
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {currentUser?.name || 'N/A'}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Role
              </Typography>
              <Typography variant="body2">
                {currentUser?.role || 'User'}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" disabled={!currentUser?.id?.toString().startsWith('cloud:')}>
                Change Password
              </Button>
            </CardActions>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cloud Sync Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Google Sheets backup runs daily at midnight.
              </Alert>
              
              <Typography variant="body2">
                Backup will upload all completed weigh tickets to the configured Google Spreadsheet.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" disabled>
                Run Manual Backup
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      
      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={handleCloseCopyAlert}
        message="Device ID copied to clipboard!"
      />
    </Box>
  );
}

export default Settings; 