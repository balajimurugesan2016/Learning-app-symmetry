const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'learning_tracker.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Clearing data...');

    db.run("DELETE FROM learnings", (err) => {
        if (err) console.error('Error clearing learnings:', err.message);
        else console.log("Learnings table cleared.");
    });

    db.run("DELETE FROM users", (err) => {
        if (err) console.error('Error clearing users:', err.message);
        else console.log("Users table cleared.");
    });

    // Optional: Reset Auto Increment
    db.run("DELETE FROM sqlite_sequence WHERE name='learnings' OR name='users'", (err) => {
        if (err) console.error('Error resetting sequences:', err.message);
        else console.log("Auto-increment counters reset.");
    });
});

db.close((err) => {
    if (err) console.error(err.message);
    else console.log('Database connection closed.');
});
