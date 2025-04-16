import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { weighTicketsApi } from '../../services/api';

function WeighTicketList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(
    location.state?.filter || 'all'
  );

  useEffect(() => {
    fetchTickets();
  }, [page, rowsPerPage, searchTerm, statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await weighTicketsApi.getAll(params);
      
      setTickets(response.data.tickets || []);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching weigh tickets:', error);
      setError('Failed to load weigh tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this weigh ticket?')) {
      return;
    }
    
    try {
      await weighTicketsApi.delete(id);
      fetchTickets();
    } catch (error) {
      console.error('Error deleting weigh ticket:', error);
      alert('Failed to delete weigh ticket. Please try again.');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const getStatusChip = (status) => {
    let color = 'default';
    
    switch (status) {
      case 'pending':
        color = 'warning';
        break;
      case 'completed':
        color = 'success';
        break;
      case 'cancelled':
        color = 'error';
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip
        label={status.toUpperCase()}
        color={color}
        size="small"
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Weigh Tickets
        </Typography>
        <Box>
          <Button
            variant="outlined"
            sx={{ mr: 1 }}
            onClick={() => navigate('/weighing')}
          >
            Start Weighing
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/weigh-tickets/new')}
          >
            Add Ticket
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search tickets by number, customer, or material"
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mr: 2 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              label="Status"
              onChange={handleStatusChange}
              startAdornment={
                <InputAdornment position="start">
                  <FilterIcon />
                </InputAdornment>
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell>Net Weight</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No weigh tickets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>{ticket.ticket_number}</TableCell>
                        <TableCell>{ticket.customer_name || 'N/A'}</TableCell>
                        <TableCell>{ticket.material}</TableCell>
                        <TableCell>
                          {ticket.net_weight 
                            ? `${ticket.net_weight} ${ticket.unit}` 
                            : 'Pending'}
                        </TableCell>
                        <TableCell>
                          {getStatusChip(ticket.status)}
                        </TableCell>
                        <TableCell>
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => navigate(`/weigh-tickets/${ticket.id}`)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(ticket.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}

export default WeighTicketList; 