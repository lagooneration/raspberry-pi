const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database');
const { logger } = require('../utils/logger');
const router = express.Router();

// Login with local user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user by username
    const user = await query.get(
      'SELECT id, username, password_hash, name, role FROM local_users WHERE username = ?',
      [username]
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await query.run(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, user.id, expiresAt.toISOString()]
    );
    
    // Return user info and session
    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      session: {
        id: sessionId,
        expires_at: expiresAt.toISOString()
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    await query.run('DELETE FROM sessions WHERE id = ?', [session_id]);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Validate session
router.post('/validate-session', async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const session = await query.get(
      'SELECT s.*, u.username, u.name, u.role FROM sessions s JOIN local_users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP',
      [session_id]
    );
    
    if (!session) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired session' });
    }
    
    res.json({
      valid: true,
      user: {
        id: session.user_id,
        username: session.username,
        name: session.name,
        role: session.role
      },
      expires_at: session.expires_at
    });
  } catch (error) {
    logger.error('Session validation error:', error);
    res.status(500).json({ error: 'Session validation failed' });
  }
});

// Create new user (admin only)
router.post('/users', async (req, res) => {
  try {
    const { username, password, name, role = 'operator' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if username already exists
    const existingUser = await query.get(
      'SELECT id FROM local_users WHERE username = ?',
      [username]
    );
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await query.run(
      'INSERT INTO local_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [username, passwordHash, name || null, role]
    );
    
    const newUser = await query.get(
      'SELECT id, username, name, role FROM local_users WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newUser);
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { user_id, current_password, new_password } = req.body;
    
    if (!user_id || !current_password || !new_password) {
      return res.status(400).json({ error: 'User ID, current password, and new password are required' });
    }
    
    // Get user
    const user = await query.get(
      'SELECT id, password_hash FROM local_users WHERE id = ?',
      [user_id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);
    
    // Update password
    await query.run(
      'UPDATE local_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, user_id]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Authenticate with Supabase token
router.post('/cloud-auth', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Validate token with our API
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/validate-token?token=${token}`);
    const data = await response.json();
    
    if (!data.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Create a temporary session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await query.run(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, `cloud:${data.user_id}`, expiresAt.toISOString()]
    );
    
    res.json({
      user: {
        id: `cloud:${data.user_id}`,
        username: 'cloud_user',
        name: 'Cloud User',
        role: 'operator'
      },
      session: {
        id: sessionId,
        expires_at: expiresAt.toISOString()
      }
    });
  } catch (error) {
    logger.error('Cloud authentication error:', error);
    res.status(500).json({ error: 'Cloud authentication failed' });
  }
});

module.exports = router; 