# EndustryAI Scale Frontend

This is the frontend application for the EndustryAI Weight Scale system. It provides a user interface for managing weigh scale operations on the Raspberry Pi.

## Features

- Authentication with both local users and cloud tokens
- Customer management
- Weigh ticket creation and management
- Real-time weighing operations
- Device settings and information

## Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Build for production
npm run build
```

## Project Structure

- `src/components/` - Reusable UI components
- `src/contexts/` - React contexts for state management
- `src/pages/` - Application pages and routes
- `src/services/` - API services for communicating with the backend
- `src/App.js` - Main application component with routing
- `src/index.js` - Application entry point

## Development

The frontend development server runs on port 3001 by default, while the backend runs on port 3000. The `"proxy": "http://localhost:3000"` setting in `package.json` allows API requests to be proxied to the backend during development.

## Authentication

The application supports two authentication methods:

1. **Local Authentication** - Using username and password stored in the local SQLite database
2. **Cloud Authentication** - Using a token provided by the cloud dashboard

## Production Deployment

When running in production, the backend serves the frontend static files. To build the frontend for production:

```bash
npm run build
```

This creates a `build` directory with the production-ready files. The backend is configured to serve these files. 