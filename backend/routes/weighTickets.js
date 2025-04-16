const express = require('express');
const { query } = require('../database');
const { logger } = require('../utils/logger');
const router = express.Router();

// Generate a unique ticket number with prefix YYYY-MM-DD-XXXX
function generateTicketNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  
  return `${year}-${month}-${day}-${random}`;
}

// Get all weigh tickets with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      customer_id,
      search,
      start_date,
      end_date
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClauses = [];
    let params = [];
    
    if (status) {
      whereClauses.push('wt.status = ?');
      params.push(status);
    }
    
    if (customer_id) {
      whereClauses.push('wt.customer_id = ?');
      params.push(customer_id);
    }
    
    if (search) {
      whereClauses.push('(wt.ticket_number LIKE ? OR wt.vehicle_id LIKE ? OR wt.material LIKE ? OR c.name LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    if (start_date) {
      whereClauses.push('wt.created_at >= ?');
      params.push(start_date);
    }
    
    if (end_date) {
      whereClauses.push('wt.created_at <= ?');
      params.push(end_date);
    }
    
    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM weigh_tickets wt
      LEFT JOIN customers c ON wt.customer_id = c.id
      ${whereClause}
    `;
    
    const countResult = await query.get(countQuery, params);
    const total = countResult.total;
    
    // Get paginated results
    const ticketsQuery = `
      SELECT 
        wt.*,
        c.name as customer_name,
        c.company as customer_company
      FROM weigh_tickets wt
      LEFT JOIN customers c ON wt.customer_id = c.id
      ${whereClause}
      ORDER BY wt.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const tickets = await query.all(ticketsQuery, [...params, limit, offset]);
    
    res.json({
      tickets,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching weigh tickets:', error);
    res.status(500).json({ error: 'Failed to retrieve weigh tickets' });
  }
});

// Get a single weigh ticket by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await query.get(`
      SELECT 
        wt.*,
        c.name as customer_name,
        c.company as customer_company
      FROM weigh_tickets wt
      LEFT JOIN customers c ON wt.customer_id = c.id
      WHERE wt.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Weigh ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    logger.error(`Error fetching weigh ticket ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve weigh ticket' });
  }
});

// Create a new weigh in ticket
router.post('/', async (req, res) => {
  try {
    const { 
      customer_id, 
      vehicle_id, 
      material, 
      gross_weight,
      tare_weight,
      unit = 'kg', 
      notes 
    } = req.body;
    
    if (!material) {
      return res.status(400).json({ error: 'Material is required' });
    }
    
    // Generate a ticket number
    const ticketNumber = generateTicketNumber();
    
    // Calculate net weight if both gross and tare are provided
    let netWeight = null;
    if (gross_weight !== null && gross_weight !== undefined && 
        tare_weight !== null && tare_weight !== undefined) {
      netWeight = gross_weight - tare_weight;
    }
    
    // Determine status based on weights
    let status = 'pending';
    if (gross_weight !== null && gross_weight !== undefined && 
        tare_weight !== null && tare_weight !== undefined && 
        netWeight !== null) {
      status = 'completed';
    }
    
    // Current timestamp for weigh-in and possibly weigh-out
    const now = new Date().toISOString();
    
    const result = await query.run(`
      INSERT INTO weigh_tickets (
        ticket_number, customer_id, vehicle_id, material, 
        gross_weight, tare_weight, net_weight, unit,
        weigh_in_time, weigh_out_time, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ticketNumber,
      customer_id || null,
      vehicle_id || null,
      material,
      gross_weight || null,
      tare_weight || null,
      netWeight,
      unit,
      gross_weight ? now : null,  // If we have gross weight, set weigh-in time
      (gross_weight && tare_weight) ? now : null, // If we have both, set weigh-out time
      status,
      notes || null
    ]);
    
    const newTicket = await query.get(`
      SELECT 
        wt.*,
        c.name as customer_name,
        c.company as customer_company
      FROM weigh_tickets wt
      LEFT JOIN customers c ON wt.customer_id = c.id
      WHERE wt.id = ?
    `, [result.lastID]);
    
    res.status(201).json(newTicket);
  } catch (error) {
    logger.error('Error creating weigh ticket:', error);
    res.status(500).json({ error: 'Failed to create weigh ticket' });
  }
});

// Update a weigh ticket (for weigh-out or edits)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_id, 
      vehicle_id, 
      material, 
      gross_weight,
      tare_weight,
      unit, 
      notes,
      status
    } = req.body;
    
    // Check if ticket exists
    const ticket = await query.get('SELECT * FROM weigh_tickets WHERE id = ?', [id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Weigh ticket not found' });
    }
    
    // Build update fields and values
    const updates = [];
    const values = [];
    
    if (customer_id !== undefined) {
      updates.push('customer_id = ?');
      values.push(customer_id || null);
    }
    
    if (vehicle_id !== undefined) {
      updates.push('vehicle_id = ?');
      values.push(vehicle_id || null);
    }
    
    if (material !== undefined) {
      updates.push('material = ?');
      values.push(material);
    }
    
    if (unit !== undefined) {
      updates.push('unit = ?');
      values.push(unit);
    }
    
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes || null);
    }
    
    // Handle weights specifically to update timestamps properly
    const now = new Date().toISOString();
    
    // Handle gross weight update (weigh-in)
    if (gross_weight !== undefined) {
      updates.push('gross_weight = ?');
      values.push(gross_weight || null);
      
      // If adding gross weight first time, update weigh-in time
      if (gross_weight && !ticket.gross_weight) {
        updates.push('weigh_in_time = ?');
        values.push(now);
      }
    }
    
    // Handle tare weight update (weigh-out)
    if (tare_weight !== undefined) {
      updates.push('tare_weight = ?');
      values.push(tare_weight || null);
      
      // If adding tare weight first time, update weigh-out time
      if (tare_weight && !ticket.tare_weight) {
        updates.push('weigh_out_time = ?');
        values.push(now);
      }
    }
    
    // Calculate and update net weight if we have both weights
    let calculatedNetWeight = null;
    
    const finalGrossWeight = gross_weight !== undefined ? gross_weight : ticket.gross_weight;
    const finalTareWeight = tare_weight !== undefined ? tare_weight : ticket.tare_weight;
    
    if (finalGrossWeight !== null && finalTareWeight !== null) {
      calculatedNetWeight = finalGrossWeight - finalTareWeight;
      updates.push('net_weight = ?');
      values.push(calculatedNetWeight);
    }
    
    // Update status if explicitly provided or based on weights
    let finalStatus = status;
    if (finalStatus === undefined) {
      if (finalGrossWeight !== null && finalTareWeight !== null && calculatedNetWeight !== null) {
        finalStatus = 'completed';
      } else if (finalGrossWeight !== null || finalTareWeight !== null) {
        finalStatus = 'pending';
      }
    }
    
    if (finalStatus !== undefined) {
      updates.push('status = ?');
      values.push(finalStatus);
    }
    
    // Add timestamp and ID
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }
    
    const updateQuery = `
      UPDATE weigh_tickets 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `;
    
    await query.run(updateQuery, values);
    
    const updatedTicket = await query.get(`
      SELECT 
        wt.*,
        c.name as customer_name,
        c.company as customer_company
      FROM weigh_tickets wt
      LEFT JOIN customers c ON wt.customer_id = c.id
      WHERE wt.id = ?
    `, [id]);
    
    res.json(updatedTicket);
  } catch (error) {
    logger.error(`Error updating weigh ticket ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update weigh ticket' });
  }
});

// Delete a weigh ticket
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if ticket exists
    const ticket = await query.get('SELECT * FROM weigh_tickets WHERE id = ?', [id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Weigh ticket not found' });
    }
    
    await query.run('DELETE FROM weigh_tickets WHERE id = ?', [id]);
    
    res.json({ message: 'Weigh ticket deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting weigh ticket ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete weigh ticket' });
  }
});

module.exports = router; 