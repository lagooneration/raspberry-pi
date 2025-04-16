const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Get database path from env or use default
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/weight_scale.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

// Convert db.run to promise-based
const run = promisify(db.run.bind(db));
const all = promisify(db.all.bind(db));
const get = promisify(db.get.bind(db));

// Setup database tables
const setupDatabase = async () => {
  try {
    // Enable foreign keys
    await run('PRAGMA foreign_keys = ON;');

    // Create customers table
    await run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create weigh_tickets table
    await run(`
      CREATE TABLE IF NOT EXISTS weigh_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER,
        vehicle_id TEXT,
        material TEXT NOT NULL,
        gross_weight REAL,
        tare_weight REAL,
        net_weight REAL,
        unit TEXT DEFAULT 'kg',
        weigh_in_time DATETIME,
        weigh_out_time DATETIME,
        status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        backup_status TEXT CHECK(backup_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
        FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
      )
    `);

    // Create local_users table for offline operation
    await run(`
      CREATE TABLE IF NOT EXISTS local_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT CHECK(role IN ('admin', 'operator')) DEFAULT 'operator',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create app_settings table
    await run(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Store device ID in settings if not already set
    if (process.env.PI_DEVICE_ID) {
      const deviceIdExists = await get(
        'SELECT value FROM app_settings WHERE key = ?',
        ['device_id']
      );

      if (!deviceIdExists) {
        await run(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
          ['device_id', process.env.PI_DEVICE_ID]
        );
      }
    }

    return true;
  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  }
};

module.exports = {
  db,
  setupDatabase,
  // Exported database methods
  query: {
    run,
    all,
    get
  }
}; 