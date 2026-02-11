const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    console.log('Registration attempt:', { email, name, password: password ? '***' : 'missing' });

    if (!email || !name || !password) {
      console.log('Missing fields');
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Database error checking user:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      if (user) {
        console.log('User already exists');
        return res.status(400).json({ error: 'User already exists' });
      }

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Insert new user
        db.run(
          'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
          [email, name, hashedPassword],
          function(err) {
            if (err) {
              console.error('Database error inserting user:', err);
              return res.status(500).json({ error: 'Failed to create user: ' + err.message });
            }

            console.log('User created with ID:', this.lastID);

            // Generate JWT token
            const token = jwt.sign(
              { id: this.lastID, email, name },
              JWT_SECRET,
              { expiresIn: '7d' }
            );

            res.status(201).json({
              message: 'User created successfully',
              token,
              user: { id: this.lastID, email, name }
            });
          }
        );
      } catch (hashError) {
        console.error('Error hashing password:', hashError);
        return res.status(500).json({ error: 'Error processing password: ' + hashError.message });
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, email: user.email, name: user.name }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
