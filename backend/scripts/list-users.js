// Script to list all users in the database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'crypto_dashboard.db');
const db = new sqlite3.Database(dbPath);

console.log('Fetching all users...\n');

db.all('SELECT id, email, name, created_at FROM users', [], (err, rows) => {
  if (err) {
    console.error('Database error:', err);
    db.close();
    return;
  }

  if (rows.length === 0) {
    console.log('No users found in database.');
  } else {
    console.log(`Found ${rows.length} user(s):\n`);
    rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
  }

  db.close();
});
