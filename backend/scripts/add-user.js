// Script to add a user directly to the database
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, 'crypto_dashboard.db');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function addUser() {
  rl.question('Enter email: ', async (email) => {
    rl.question('Enter name: ', async (name) => {
      rl.question('Enter password: ', async (password) => {
        try {
          // Check if user exists
          db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
              console.error('Database error:', err);
              rl.close();
              db.close();
              return;
            }
            
            if (user) {
              console.log('User already exists!');
              rl.close();
              db.close();
              return;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user
            db.run(
              'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
              [email, name, hashedPassword],
              function(err) {
                if (err) {
                  console.error('Error creating user:', err);
                } else {
                  console.log(`User created successfully with ID: ${this.lastID}`);
                  console.log(`Email: ${email}`);
                  console.log(`Name: ${name}`);
                }
                rl.close();
                db.close();
              }
            );
          });
        } catch (error) {
          console.error('Error:', error);
          rl.close();
          db.close();
        }
      });
    });
  });
}

addUser();
