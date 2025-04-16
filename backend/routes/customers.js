const express = require('express');
const { query } = require('../database');
const { logger } = require('../utils/logger');
const router = express.Router();

// Get all customers
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let customers;
    
    if (search) {
      customers = await query.all(
        `SELECT * FROM customers 
         WHERE name LIKE ? OR company LIKE ? 
         ORDER BY name ASC`,
        [`%${search}%`, `%${search}%`]
      );
    } else {
      customers = await query.all('SELECT * FROM customers ORDER BY name ASC');
    }
    
    res.json(customers);
  } catch (error) {
    logger.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to retrieve customers' });
  }
});

// Get a single customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await query.get('SELECT * FROM customers WHERE id = ?', [id]);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    logger.error(`Error fetching customer ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve customer' });
  }
});

// Create a new customer
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    
    const result = await query.run(
      `INSERT INTO customers (name, company, email, phone, address) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, company || null, email || null, phone || null, address || null]
    );
    
    const newCustomer = await query.get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
    
    res.status(201).json(newCustomer);
  } catch (error) {
    logger.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update a customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    
    // Check if customer exists
    const customer = await query.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    await query.run(
      `UPDATE customers 
       SET name = ?, company = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, company || null, email || null, phone || null, address || null, id]
    );
    
    const updatedCustomer = await query.get('SELECT * FROM customers WHERE id = ?', [id]);
    
    res.json(updatedCustomer);
  } catch (error) {
    logger.error(`Error updating customer ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete a customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if customer exists
    const customer = await query.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check if customer has weigh tickets
    const hasTickets = await query.get(
      'SELECT COUNT(*) as count FROM weigh_tickets WHERE customer_id = ?', 
      [id]
    );
    
    if (hasTickets && hasTickets.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with associated weigh tickets' 
      });
    }
    
    await query.run('DELETE FROM customers WHERE id = ?', [id]);
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting customer ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router; 