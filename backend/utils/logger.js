const winston = require('winston');
const path = require('path');

// Create a logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'endustryai-pi' },
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...rest }) => {
          return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(rest).length ? JSON.stringify(rest, null, 2) : ''}`;
        })
      ),
    }),
  ],
});

// Setup function that adds file transports in production
const setupLogger = () => {
  if (process.env.NODE_ENV === 'production') {
    // Add file transports in production
    logger.add(
      new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
    
    logger.add(
      new winston.transports.File({
        filename: path.join(__dirname, '../../logs/app.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }
};

module.exports = { logger, setupLogger }; 