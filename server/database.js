const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'learning_tracker.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                email TEXT UNIQUE,
                password_hash TEXT,
                phone_number TEXT,
                is_verified INTEGER DEFAULT 0,
                verification_token TEXT,
                reset_token TEXT,
                reset_token_expiry INTEGER
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table', err.message);
                }
            });

            // For this update, we are recreating the learnings table to link it to users
            // In a production environment with critical data, a migration script would be needed
            db.run(`DROP TABLE IF EXISTS learnings`, (err) => {
                if (err) console.error('Error dropping old learnings table', err.message);

                db.run(`CREATE TABLE IF NOT EXISTS learnings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    user_id INTEGER,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating learnings table', err.message);
                    }
                });
            });
        });
    }
});

module.exports = db;
