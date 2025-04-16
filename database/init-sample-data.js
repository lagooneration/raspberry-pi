/**
 * Sample Data Initialization Script
 * 
 * This script populates the database with sample data for testing purposes.
 * Run this script using: node database/init-sample-data.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { setupDatabase, query } = require('../backend/database');
const { v4: uuidv4 } = require('uuid');

async function insertSampleData() {
  console.log('Setting up database...');
  await setupDatabase();
  
  console.log('Creating sample admin user...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  
  try {
    await query.run(
      'INSERT OR IGNORE INTO local_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['admin', adminPasswordHash, 'Admin User', 'admin']
    );
    
    console.log('Creating sample operator user...');
    const operatorPasswordHash = await bcrypt.hash('operator123', 10);
    
    await query.run(
      'INSERT OR IGNORE INTO local_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['operator', operatorPasswordHash, 'Scale Operator', 'operator']
    );
    
    console.log('Creating sample customers...');
    const customers = [
      { name: 'ABC Logistics', company: 'ABC Inc.', email: 'contact@abclogistics.com', phone: '555-1234', address: '123 Main St, Anytown' },
      { name: 'XYZ Manufacturing', company: 'XYZ Corp', email: 'info@xyzmfg.com', phone: '555-5678', address: '456 Industrial Blvd, Cityville' },
      { name: 'Smith Farming', company: 'Smith Family Farms', email: 'john@smithfarms.com', phone: '555-9101', address: 'Rural Route 2, Farmville' },
    ];
    
    for (const customer of customers) {
      await query.run(
        'INSERT OR IGNORE INTO customers (name, company, email, phone, address) VALUES (?, ?, ?, ?, ?)',
        [customer.name, customer.company, customer.email, customer.phone, customer.address]
      );
    }
    
    console.log('Creating sample weigh tickets...');
    const materials = ['Gravel', 'Sand', 'Soil', 'Concrete', 'Asphalt', 'Coal'];
    const units = ['kg', 'ton'];
    const vehicles = ['Truck123', 'Trailer456', 'Vehicle789', 'Lorry101'];
    
    // Get customer IDs
    const customersData = await query.all('SELECT id FROM customers');
    
    // Create some completed tickets
    for (let i = 0; i < 10; i++) {
      const material = materials[Math.floor(Math.random() * materials.length)];
      const unit = units[Math.floor(Math.random() * units.length)];
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      const customer = customersData[Math.floor(Math.random() * customersData.length)];
      
      const grossWeight = 1000 + Math.floor(Math.random() * 9000);
      const tareWeight = 500 + Math.floor(Math.random() * 500);
      const netWeight = grossWeight - tareWeight;
      
      // Random date in the last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      // Generate ticket number with date prefix
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(1000 + Math.random() * 9000);
      const ticketNumber = `${year}-${month}-${day}-${random}`;
      
      await query.run(
        `INSERT OR IGNORE INTO weigh_tickets 
         (ticket_number, customer_id, vehicle_id, material, gross_weight, tare_weight, net_weight, 
          unit, weigh_in_time, weigh_out_time, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticketNumber,
          customer.id,
          vehicle,
          material,
          grossWeight,
          tareWeight,
          netWeight,
          unit,
          date.toISOString(),
          new Date(date.getTime() + 30 * 60000).toISOString(), // 30 minutes later
          'completed',
          date.toISOString(),
          date.toISOString()
        ]
      );
    }
    
    // Create some pending tickets
    for (let i = 0; i < 5; i++) {
      const material = materials[Math.floor(Math.random() * materials.length)];
      const unit = units[Math.floor(Math.random() * units.length)];
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      const customer = customersData[Math.floor(Math.random() * customersData.length)];
      
      const grossWeight = 1000 + Math.floor(Math.random() * 9000);
      
      // Random date in the last 2 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 2));
      
      // Generate ticket number with date prefix
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(1000 + Math.random() * 9000);
      const ticketNumber = `${year}-${month}-${day}-${random}`;
      
      await query.run(
        `INSERT OR IGNORE INTO weigh_tickets 
         (ticket_number, customer_id, vehicle_id, material, gross_weight,
          unit, weigh_in_time, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticketNumber,
          customer.id,
          vehicle,
          material,
          grossWeight,
          unit,
          date.toISOString(),
          'pending',
          date.toISOString(),
          date.toISOString()
        ]
      );
    }
    
    console.log('Sample data initialization complete!');
    console.log('You can now log in with:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  ---or---');
    console.log('  Username: operator');
    console.log('  Password: operator123');
    
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

// Run the initialization
insertSampleData().catch(console.error); 