import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CardActions,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Scale as ScaleIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { weighTicketsApi } from '../services/api';
import { customersApi } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingTickets: 0,
    completedTickets: 0,
    totalCustomers: 0
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch recent weigh tickets
      const ticketsResponse = await weighTicketsApi.getAll({
        limit: 5,
        page: 1
      });
      
      // Fetch pending tickets count
      const pendingResponse = await weighTicketsApi.getAll({
        status: 'pending',
        limit: 1,
        page: 1
      });
      
      // Fetch completed tickets count
      const completedResponse = await weighTicketsApi.getAll({
        status: 'completed',
        limit: 1,
        page: 1
      });
      
      // Fetch customers count
      const customersResponse = await customersApi.getAll();
      
      setRecentTickets(ticketsResponse.data.tickets || []);
      setStats({
        pendingTickets: pendingResponse.data.pagination.total || 0,
        completedTickets: completedResponse.data.pagination.total || 0,
        totalCustomers: customersResponse.data.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          variant="outlined" 
          onClick={fetchDashboardData}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Dashboard</Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchDashboardData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<ScaleIcon />}
            onClick={() => navigate('/weighing')}
          >
            New Weighing
          </Button>
        </Box>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <ScaleIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h5" component="div" sx={{ mt: 1 }}>
                {stats.pendingTickets}
              </Typography>
              <Typography color="text.secondary">
                Pending Weigh Tickets
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/weigh-tickets', { state: { filter: 'pending' } })}
              >
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <ReceiptIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h5" component="div" sx={{ mt: 1 }}>
                {stats.completedTickets}
              </Typography>
              <Typography color="text.secondary">
                Completed Weigh Tickets
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/weigh-tickets', { state: { filter: 'completed' } })}
              >
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h5" component="div" sx={{ mt: 1 }}>
                {stats.totalCustomers}
              </Typography>
              <Typography color="text.secondary">
                Total Customers
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/customers')}
              >
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      
      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Quick Actions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Button 
              variant="outlined" 
              fullWidth
              startIcon={<ScaleIcon />}
              onClick={() => navigate('/weighing')}
              sx={{ height: '100%' }}
            >
              New Weighing
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button 
              variant="outlined" 
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => navigate('/weigh-tickets/new')}
              sx={{ height: '100%' }}
            >
              New Ticket
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button 
              variant="outlined" 
              fullWidth
              startIcon={<PeopleIcon />}
              onClick={() => navigate('/customers/new')}
              sx={{ height: '100%' }}
            >
              Add Customer
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button 
              variant="outlined" 
              fullWidth
              onClick={() => navigate('/weigh-tickets')}
              sx={{ height: '100%' }}
            >
              All Tickets
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Recent Transactions */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
        <Divider sx={{ mb: 1 }} />
        
        {recentTickets.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
            No recent weigh tickets found
          </Typography>
        ) : (
          <List>
            {recentTickets.map((ticket) => (
              <React.Fragment key={ticket.id}>
                <ListItem 
                  button
                  onClick={() => navigate(`/weigh-tickets/${ticket.id}`)}
                >
                  <ListItemText
                    primary={`Ticket #${ticket.ticket_number}`}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" display="block">
                          Customer: {ticket.customer_name || 'N/A'} 
                        </Typography>
                        <Typography component="span" variant="body2" display="block">
                          Material: {ticket.material}
                        </Typography>
                        <Typography component="span" variant="body2" display="block">
                          Weight: {ticket.net_weight ? `${ticket.net_weight} ${ticket.unit}` : 'Pending'}
                        </Typography>
                        <Typography component="span" variant="body2" color="textSecondary">
                          {formatDate(ticket.created_at)}
                        </Typography>
                      </>
                    }
                  />
                  <Box>
                    <Typography 
                      variant="caption" 
                      sx={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 
                          ticket.status === 'completed' ? 'success.light' :
                          ticket.status === 'pending' ? 'warning.light' : 'default',
                        color: 
                          ticket.status === 'completed' ? 'success.contrastText' :
                          ticket.status === 'pending' ? 'warning.contrastText' : 'default',
                      }}
                    >
                      {ticket.status.toUpperCase()}
                    </Typography>
                  </Box>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
        
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Button 
            onClick={() => navigate('/weigh-tickets')}
          >
            View All Tickets
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default Dashboard; 