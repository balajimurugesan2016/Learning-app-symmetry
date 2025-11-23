const cron = require('node-cron');
const db = require('./database');
const { sendNotification } = require('./notificationService');

const checkAndNotify = () => {
    console.log('Running scheduler check...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    db.all(`SELECT learnings.*, users.phone_number FROM learnings JOIN users ON learnings.user_id = users.id`, [], (err, rows) => {
        if (err) {
            console.error('Error querying database:', err);
            return;
        }

        rows.forEach((row) => {
            const createdDate = new Date(row.created_at);
            createdDate.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(today - createdDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if ([2, 3, 7].includes(diffDays)) {
                const message = `Recall what you learned ${diffDays} days ago: "${row.content}"`;
                // Default phone number if not in DB, or use row.phone_number
                // For this MVP, we'll assume a default env var or the row has it.
                // If row.phone_number is missing, we can't send.
                const userPhone = row.phone_number || process.env.USER_PHONE_NUMBER;

                if (userPhone) {
                    sendNotification(userPhone, message);
                } else {
                    console.log(`[Scheduler] Notification due for ID ${row.id} (${diffDays} days ago), but no phone number available.`);
                    console.log(`Message would be: ${message}`);
                }
            }
        });
    });
};

// Run every minute for demonstration purposes, or every day at 9 AM
// For dev: '*/1 * * * *' (every minute)
// For prod: '0 9 * * *' (every day at 9 AM)
const startScheduler = () => {
    // Using every minute for easier testing
    cron.schedule('*/1 * * * *', () => {
        checkAndNotify();
    });
    console.log('Scheduler started (running every minute for testing).');
};

module.exports = { startScheduler };
