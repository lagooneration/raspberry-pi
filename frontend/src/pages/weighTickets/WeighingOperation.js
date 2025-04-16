import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stepper,
  Step,
  StepLabel,
  Divider
} from '@mui/material';
import { 
  Scale as ScaleIcon,
  Save as SaveIcon,
  LocalShipping as TruckIcon,
  Cancel as CancelIcon 
} from '@mui/icons-material';
import { weighTicketsApi, customersApi } from '../../services/api';

const steps = ['Vehicle Selection', 'First Weighing', 'Second Weighing', 'Completed'];

function WeighingOperation() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [weighingInProgress, setWeighingInProgress] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
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
  
  useEffect(() => {
    fetchCustomers();
    generateTicketNumber();
  }, []);
  
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      const response = await customersApi.getAll();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers. Please try again.');
    } finally {
      setCustomersLoading(false);
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
  };
  
  const calculateNetWeight = () => {
    if (ticket.gross_weight && ticket.tare_weight) {
      const grossWeight = parseFloat(ticket.gross_weight);
      const tareWeight = parseFloat(ticket.tare_weight);
      
      if (!isNaN(grossWeight) && !isNaN(tareWeight)) {
        const netWeight = grossWeight - tareWeight;
        setTicket(prev => ({
          ...prev,
          net_weight: netWeight > 0 ? netWeight.toString() : '0'
        }));
      }
    }
  };
  
  const handleNext = () => {
    if (activeStep === 0) {
      if (!ticket.vehicle_id || !ticket.material) {
        setError('Vehicle ID and material are required');
        return;
      }
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  const performWeighing = () => {
    setError(null);
    setWeighingInProgress(true);
    
    // Simulate getting weight from scale
    setTimeout(() => {
      const simulatedWeight = (1000 + Math.random() * 9000).toFixed(1);
      
      if (activeStep === 1) {
        // First weighing (gross)
        setTicket(prev => ({
          ...prev,
          gross_weight: simulatedWeight
        }));
      } else if (activeStep === 2) {
        // Second weighing (tare)
        setTicket(prev => ({
          ...prev,
          tare_weight: simulatedWeight,
          weigh_out_time: new Date().toISOString()
        }));
        
        // Calculate net weight
        setTimeout(() => {
          calculateNetWeight();
        }, 500);
      }
      
      setWeighingInProgress(false);
    }, 2000);
  };
  
  const saveTicket = async () => {
    try {
      setError(null);
      
      // Set as completed since we have all weights
      const completedTicket = {
        ...ticket,
        status: 'completed'
      };
      
      await weighTicketsApi.create(completedTicket);
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/weigh-tickets');
      }, 2000);
    } catch (error) {
      console.error('Error saving weigh ticket:', error);
      setError('Failed to save weigh ticket. Please try again.');
    }
  };
  
  const getCustomerName = (id) => {
    const customer = customers.find(c => c.id === id);
    return customer ? customer.name : 'Unknown';
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Weighing Operation
        </Typography>
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={() => navigate('/weigh-tickets')}
          color="error"
        >
          Cancel
        </Button>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Weigh ticket saved successfully!
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box sx={{ mt: 4 }}>
          {activeStep === 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                Vehicle & Material Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Ticket Number"
                    value={ticket.ticket_number}
                    disabled
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
                    required
                    fullWidth
                    label="Vehicle ID"
                    name="vehicle_id"
                    value={ticket.vehicle_id || ''}
                    onChange={handleChange}
                    placeholder="e.g., License Plate Number"
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
                    placeholder="e.g., Gravel, Sand, etc."
                  />
                </Grid>
                
                <Grid item xs={12}>
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
              </Grid>
            </>
          )}
          
          {activeStep === 1 && (
            <>
              <Typography variant="h6" gutterBottom>
                First Weighing (Gross Weight)
              </Typography>
              
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="body1">
                  <strong>Vehicle:</strong> {ticket.vehicle_id}
                </Typography>
                <Typography variant="body1">
                  <strong>Material:</strong> {ticket.material}
                </Typography>
                {ticket.customer_id && (
                  <Typography variant="body1">
                    <strong>Customer:</strong> {getCustomerName(ticket.customer_id)}
                  </Typography>
                )}
              </Box>
              
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Gross Weight"
                    name="gross_weight"
                    value={ticket.gross_weight || ''}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: ticket.unit,
                      readOnly: true,
                    }}
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ScaleIcon />}
                    onClick={performWeighing}
                    disabled={weighingInProgress}
                    fullWidth
                    sx={{ py: 2 }}
                  >
                    {weighingInProgress ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Get Weight from Scale'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </>
          )}
          
          {activeStep === 2 && (
            <>
              <Typography variant="h6" gutterBottom>
                Second Weighing (Tare Weight)
              </Typography>
              
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="body1">
                  <strong>Vehicle:</strong> {ticket.vehicle_id}
                </Typography>
                <Typography variant="body1">
                  <strong>Material:</strong> {ticket.material}
                </Typography>
                {ticket.customer_id && (
                  <Typography variant="body1">
                    <strong>Customer:</strong> {getCustomerName(ticket.customer_id)}
                  </Typography>
                )}
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1">
                  <strong>Gross Weight:</strong> {ticket.gross_weight} {ticket.unit}
                </Typography>
              </Box>
              
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tare Weight"
                    name="tare_weight"
                    value={ticket.tare_weight || ''}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: ticket.unit,
                      readOnly: true,
                    }}
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ScaleIcon />}
                    onClick={performWeighing}
                    disabled={weighingInProgress}
                    fullWidth
                    sx={{ py: 2 }}
                  >
                    {weighingInProgress ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Get Weight from Scale'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </>
          )}
          
          {activeStep === 3 && (
            <>
              <Typography variant="h6" gutterBottom>
                Weighing Complete
              </Typography>
              
              <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body1">
                      <strong>Ticket Number:</strong> {ticket.ticket_number}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Vehicle:</strong> {ticket.vehicle_id}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Material:</strong> {ticket.material}
                    </Typography>
                    {ticket.customer_id && (
                      <Typography variant="body1">
                        <strong>Customer:</strong> {getCustomerName(ticket.customer_id)}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body1">
                      <strong>Gross Weight:</strong> {ticket.gross_weight} {ticket.unit}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Tare Weight:</strong> {ticket.tare_weight} {ticket.unit}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.2rem', mt: 1 }}>
                      <strong>Net Weight:</strong> {ticket.net_weight} {ticket.unit}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={saveTicket}
                  size="large"
                  sx={{ py: 1.5, px: 4 }}
                >
                  Save Weigh Ticket
                </Button>
              </Box>
            </>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4 }}>
          <Button
            disabled={activeStep === 0 || activeStep === 3}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          
          {activeStep !== 3 && (
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={(activeStep === 0 && (!ticket.vehicle_id || !ticket.material)) ||
                      (activeStep === 1 && !ticket.gross_weight) ||
                      (activeStep === 2 && !ticket.tare_weight)}
            >
              {activeStep === 2 ? 'Finish' : 'Next'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default WeighingOperation; 