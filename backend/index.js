require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { setupDatabase } = require('./database');
const { setupLogger, logger } = require('./utils/logger');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const weighTicketRoutes = require('./routes/weighTickets');

// Ensure the logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Setup logging
setupLogger();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Setup middleware
app.use(helmet()); // Security headers
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Request logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Generate unique device ID if not already set
if (!process.env.PI_DEVICE_ID) {
  const configPath = path.join(__dirname, '../.env');
  const deviceId = uuidv4();
  
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    if (configContent.includes('PI_DEVICE_ID=')) {
      configContent = configContent.replace(/PI_DEVICE_ID=.*$/m, `PI_DEVICE_ID=${deviceId}`);
    } else {
      configContent += `\nPI_DEVICE_ID=${deviceId}\n`;
    }
    fs.writeFileSync(configPath, configContent);
  } else {
    fs.writeFileSync(configPath, `PI_DEVICE_ID=${deviceId}\n`);
  }
  
  process.env.PI_DEVICE_ID = deviceId;
  logger.info(`Generated new device ID: ${deviceId}`);
}

// Initialize the database
setupDatabase()
  .then(() => {
    logger.info('Database initialized successfully');
  })
  .catch(err => {
    logger.error('Failed to initialize database:', err);
    process.exit(1);
  });

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/weigh-tickets', weighTicketRoutes);

// Display ID endpoint for easy retrieval
app.get('/device-id', (req, res) => {
  res.json({
    deviceId: process.env.PI_DEVICE_ID,
    message: 'Use this ID to register your device in the cloud dashboard'
  });
});

// Token validation endpoint
app.get('/api/validate-token', async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  try {
    // Validate token with Supabase
    const response = await axios.post(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/validate_access_token`,
      {
        token,
        pi_device_id: process.env.PI_DEVICE_ID
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY
        }
      }
    );
    
    if (response.data && response.data.valid) {
      return res.json({ valid: true, user_id: response.data.user_id });
    } else {
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Token validation error:', error);
    return res.status(500).json({ error: 'Failed to validate token' });
  }
});

// Serve static frontend files for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', deviceId: process.env.PI_DEVICE_ID });
});

// Start the server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Device ID: ${process.env.PI_DEVICE_ID}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  app.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}); 