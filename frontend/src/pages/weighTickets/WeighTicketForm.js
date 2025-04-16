import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider
} from '@mui/material';
import { weighTicketsApi, customersApi } from '../../services/api';

function WeighTicketForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [ticket, setTicket] = useState({
    ticket_number: '',
    customer_id: '',
    vehicle_id: '',
    material: '',
    gross_weight: '',
    tare_weight: '',
    net_weight: '',
    unit: 'kg',
    status: 'pending',
    notes: ''
  });
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    fetchCustomers();
    if (isEdit) {
      fetchTicket();
    } else {
      generateTicketNumber();
    }
  }, [id]);
  
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      const response = await customersApi.getAll();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setCustomersLoading(false);
    }
  };
  
  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await weighTicketsApi.getById(id);
      setTicket(response.data);
    } catch (error) {
      console.error('Error fetching weigh ticket:', error);
      setError('Failed to load weigh ticket data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const generateTicketNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    
    const ticketNumber = `${year}-${month}-${day}-${random}`;
    setTicket(prev => ({ ...prev, ticket_number: ticketNumber }));
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTicket(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Calculate net weight if both gross and tare are available
    if ((name === 'gross_weight' || name === 'tare_weight') && 
        ticket.gross_weight && ticket.tare_weight) {
      const grossWeight = name === 'gross_weight' ? parseFloat(value) : parseFloat(ticket.gross_weight);
      const tareWeight = name === 'tare_weight' ? parseFloat(value) : parseFloat(ticket.tare_weight);
      
      if (!isNaN(grossWeight) && !isNaN(tareWeight)) {
        const netWeight = grossWeight - tareWeight;
        setTicket(prev => ({
          ...prev,
          net_weight: netWeight > 0 ? netWeight.toString() : '0'
        }));
      }
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!ticket.ticket_number || !ticket.material) {
      setError('Ticket number and material are required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Set completed status if we have all weights
      if (ticket.gross_weight && ticket.tare_weight && ticket.net_weight) {
        ticket.status = 'completed';
      }
      
      if (isEdit) {
        await weighTicketsApi.update(id, ticket);
      } else {
        await weighTicketsApi.create(ticket);
      }
      
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/weigh-tickets');
      }, 1500);
    } catch (error) {
      console.error('Error saving weigh ticket:', error);
      setError('Failed to save weigh ticket. Please try again.');
    } finally {
      setSaving(false);
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {isEdit ? 'Edit Weigh Ticket' : 'Add New Weigh Ticket'}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/weigh-tickets')}
        >
          Cancel
        </Button>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Weigh ticket saved successfully!
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Ticket Number"
                name="ticket_number"
                value={ticket.ticket_number}
                onChange={handleChange}
                disabled={isEdit}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={customersLoading}>
                <InputLabel id="customer-label">Customer</InputLabel>
                <Select
                  labelId="customer-label"
                  name="customer_id"
                  value={ticket.customer_id || ''}
                  onChange={handleChange}
                  label="Customer"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Vehicle ID"
                name="vehicle_id"
                value={ticket.vehicle_id || ''}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Material"
                name="material"
                value={ticket.material || ''}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="body2" color="textSecondary">Weight Information</Typography>
              </Divider>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Gross Weight"
                name="gross_weight"
                type="number"
                value={ticket.gross_weight || ''}
                onChange={handleChange}
                InputProps={{
                  endAdornment: ticket.unit
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Tare Weight"
                name="tare_weight"
                type="number"
                value={ticket.tare_weight || ''}
                onChange={handleChange}
                InputProps={{
                  endAdornment: ticket.unit
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Net Weight"
                name="net_weight"
                type="number"
                value={ticket.net_weight || ''}
                onChange={handleChange}
                InputProps={{
                  endAdornment: ticket.unit
                }}
                disabled
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="unit-label">Unit</InputLabel>
                <Select
                  labelId="unit-label"
                  name="unit"
                  value={ticket.unit || 'kg'}
                  onChange={handleChange}
                  label="Unit"
                >
                  <MenuItem value="kg">kg</MenuItem>
                  <MenuItem value="ton">ton</MenuItem>
                  <MenuItem value="lb">lb</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={ticket.status || 'pending'}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={3}
                value={ticket.notes || ''}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : isEdit ? 'Update Ticket' : 'Create Ticket'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

export default WeighTicketForm; 