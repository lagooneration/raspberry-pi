# EndustryAI Weight Scale Database

This folder contains the SQLite database for the EndustryAI Weight Scale system. The database is used to store local data for the scale operations.

## Database File

The database file `weight_scale.db` is automatically created when the application is first run. It will be stored in this directory by default, but the location can be configured in the `.env` file.

## Schema

The database contains the following tables:

### Customers

Stores information about the customers who use the weighing service.

```sql
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
```

### Weigh Tickets

Records all weighing operations.

```sql
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
```

### Local Users

Stores users who can log in locally to the system.

```sql
CREATE TABLE IF NOT EXISTS local_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK(role IN ('admin', 'operator')) DEFAULT 'operator',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Sessions

Tracks active user sessions.

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### App Settings

Stores application settings.

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Backup

The database is automatically backed up to a Google Spreadsheet on a scheduled basis. This functionality is controlled by the backup script in the backend.

## Database Management

To initialize or reset the database, you can run:

```
npm run setup
```

This will create a new database if one doesn't exist, or ensure the schema is up to date if it does exist. 