const cron = require('node-cron');
const { User, Learning } = require('./database');
const { sendNotification } = require('./notificationService');

const checkAndNotify = async () => {
    console.log('Running scheduler check...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const learnings = await Learning.findAll({
            include: User
        });

        learnings.forEach((learning) => {
            const createdDate = new Date(learning.created_at);
            createdDate.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(today - createdDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if ([2, 3, 7].includes(diffDays)) {
                const message = `Recall what you learned ${diffDays} days ago: "${learning.content}"`;
                // Default phone number if not in DB, or use user.phone_number
                const userPhone = learning.User ? learning.User.phone_number : process.env.USER_PHONE_NUMBER;

                if (userPhone) {
                    sendNotification(userPhone, message);
                } else {
                    console.log(`[Scheduler] Notification due for ID ${learning.id} (${diffDays} days ago), but no phone number available.`);
                    console.log(`Message would be: ${message}`);
                }
            }
        });
    } catch (err) {
        console.error('Error querying database:', err);
    }
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
