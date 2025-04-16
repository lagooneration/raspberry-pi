require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { setupDatabase, query } = require('./database');
const { setupLogger, logger } = require('./utils/logger');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Setup logging
setupLogger();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Generate a device ID if not already set
async function generateDeviceId() {
  const envPath = path.join(__dirname, '../.env');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Check if DEVICE_ID is already set
  if (process.env.PI_DEVICE_ID && envContent.includes('PI_DEVICE_ID=')) {
    logger.info(`Device ID already set: ${process.env.PI_DEVICE_ID}`);
    return process.env.PI_DEVICE_ID;
  }
  
  // Generate a new UUID
  const deviceId = uuidv4();
  logger.info(`Generated new device ID: ${deviceId}`);
  
  // Update .env file
  if (envContent.includes('PI_DEVICE_ID=')) {
    envContent = envContent.replace(/PI_DEVICE_ID=.*$/m, `PI_DEVICE_ID=${deviceId}`);
  } else {
    envContent += `\nPI_DEVICE_ID=${deviceId}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  process.env.PI_DEVICE_ID = deviceId;
  
  return deviceId;
}

// Create an admin user
async function createAdminUser() {
  try {
    // Check if admin already exists
    const adminExists = await query.get(
      'SELECT id FROM local_users WHERE role = ? LIMIT 1',
      ['admin']
    );
    
    if (adminExists) {
      const useExisting = await prompt('Admin user already exists. Create another? (y/N): ');
      if (useExisting.toLowerCase() !== 'y') {
        logger.info('Using existing admin user');
        return;
      }
    }
    
    logger.info('Creating a new admin user');
    
    const username = await prompt('Enter admin username: ');
    const name = await prompt('Enter admin full name: ');
    const password = await prompt('Enter admin password: ');
    
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create the admin user
    await query.run(
      'INSERT INTO local_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [username, passwordHash, name, 'admin']
    );
    
    logger.info(`Admin user ${username} created successfully`);
    
  } catch (error) {
    logger.error('Error creating admin user:', error);
    throw error;
  }
}

// Main setup function
async function setup() {
  try {
    logger.info('Starting setup process');
    
    // Initialize database
    await setupDatabase();
    logger.info('Database initialized');
    
    // Generate device ID
    const deviceId = await generateDeviceId();
    logger.info(`Device ID: ${deviceId}`);
    
    // Store device ID in settings table
    await query.run(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      ['device_id', deviceId]
    );
    
    // Create admin user
    await createAdminUser();
    
    logger.info('Setup completed successfully');
    rl.close();
    
  } catch (error) {
    logger.error('Setup failed:', error);
    rl.close();
    process.exit(1);
  }
}

// Run setup if script is called directly
if (require.main === module) {
  setup();
}

module.exports = { setup };