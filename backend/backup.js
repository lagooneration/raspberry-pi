require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { db, query } = require('./database');
const { setupLogger, logger } = require('./utils/logger');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Setup logging
setupLogger();

// Initialize the Google Sheets document
async function getSpreadsheet() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID not configured');
  }
  
  const doc = new GoogleSpreadsheet(spreadsheetId);
  
  // Authenticate with the Google Sheets API
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  
  await doc.loadInfo(); // Load document properties
  
  return doc;
}

// Format date for Google Sheets
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Backup weigh tickets to Google Sheets
async function backupWeighTickets() {
  try {
    logger.info('Starting weigh tickets backup to Google Sheets');
    
    // Get pending backup tickets
    const tickets = await query.all(`
      SELECT 
        wt.id, 
        wt.ticket_number, 
        c.name as customer_name, 
        c.company as customer_company,
        wt.vehicle_id, 
        wt.material, 
        wt.gross_weight, 
        wt.tare_weight, 
        wt.net_weight, 
        wt.unit, 
        wt.weigh_in_time, 
        wt.weigh_out_time, 
        wt.status,
        wt.notes,
        wt.created_at,
        wt.updated_at
      FROM weigh_tickets wt
      LEFT JOIN customers c ON wt.customer_id = c.id
      WHERE wt.status = 'completed' AND (wt.backup_status = 'pending' OR wt.backup_status = 'failed')
      ORDER BY wt.created_at ASC
    `);
    
    if (tickets.length === 0) {
      logger.info('No new tickets to backup');
      return;
    }
    
    logger.info(`Found ${tickets.length} weigh tickets to backup`);
    
    // Get Google Sheet
    const doc = await getSpreadsheet();
    
    // Get or create the weigh tickets sheet
    let sheet = doc.sheetsByTitle['Weigh Tickets'];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Weigh Tickets', headerValues: [
        'Ticket Number',
        'Customer',
        'Company',
        'Vehicle ID',
        'Material',
        'Gross Weight',
        'Tare Weight',
        'Net Weight',
        'Unit',
        'Weigh In Time',
        'Weigh Out Time',
        'Status',
        'Notes',
        'Created At',
        'Device ID'
      ]});
    }
    
    // Format tickets for sheet
    const rows = tickets.map(ticket => ({
      'Ticket Number': ticket.ticket_number,
      'Customer': ticket.customer_name || 'Unknown',
      'Company': ticket.customer_company || '',
      'Vehicle ID': ticket.vehicle_id || '',
      'Material': ticket.material,
      'Gross Weight': ticket.gross_weight,
      'Tare Weight': ticket.tare_weight,
      'Net Weight': ticket.net_weight,
      'Unit': ticket.unit,
      'Weigh In Time': ticket.weigh_in_time,
      'Weigh Out Time': ticket.weigh_out_time,
      'Status': ticket.status,
      'Notes': ticket.notes || '',
      'Created At': formatDate(ticket.created_at),
      'Device ID': process.env.PI_DEVICE_ID
    }));
    
    // Add rows to the sheet
    await sheet.addRows(rows);
    
    // Mark tickets as backed up
    const ticketIds = tickets.map(t => t.id).join(',');
    await query.run(`
      UPDATE weigh_tickets 
      SET backup_status = 'completed', updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${ticketIds})
    `);
    
    logger.info(`Successfully backed up ${tickets.length} tickets to Google Sheets`);
    
  } catch (error) {
    logger.error('Backup to Google Sheets failed:', error);
    
    // If we have ticket IDs, mark them as failed
    if (tickets && tickets.length > 0) {
      try {
        const ticketIds = tickets.map(t => t.id).join(',');
        await query.run(`
          UPDATE weigh_tickets 
          SET backup_status = 'failed', updated_at = CURRENT_TIMESTAMP 
          WHERE id IN (${ticketIds})
        `);
      } catch (err) {
        logger.error('Failed to update ticket status after backup failure:', err);
      }
    }
  }
}

// Main backup function
async function runBackup() {
  try {
    logger.info('Starting backup process');
    
    // Ensure database is initialized
    await require('./database').setupDatabase();
    
    // Run the backup for weigh tickets
    await backupWeighTickets();
    
    logger.info('Backup process completed');
    
    // If we're running from command line, exit the process
    if (require.main === module) {
      process.exit(0);
    }
    
  } catch (error) {
    logger.error('Backup process failed:', error);
    
    // If we're running from command line, exit with error
    if (require.main === module) {
      process.exit(1);
    }
  }
}

// If this script is run directly, execute the backup
if (require.main === module) {
  runBackup();
}

module.exports = { runBackup }; 