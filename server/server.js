const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./database');
const { startScheduler } = require('./scheduler');
const auth = require('./middleware/auth');
require('dotenv').config();
const { sendNotification } = require('./notificationService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Email Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper to send email
// Helper to send email
const sendEmail = async (to, subject, html) => {
    try {
        console.log(`Attempting to send email to ${to} with subject "${subject}"`);
        console.log('SMTP Config:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE,
            user: process.env.EMAIL_USER ? '***' : 'missing'
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html
        });
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw error;
    }
};

// Test Email Endpoint
app.get('/api/test-email', async (req, res) => {
    const email = req.query.email || process.env.EMAIL_USER;
    if (!email) return res.status(400).send('Email query param required');

    try {
        await sendEmail(email, 'Test Email', '<p>This is a test email from Learning Tracker.</p>');
        res.send(`Test email sent to ${email}`);
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// Test WhatsApp Notification Endpoint
app.get('/api/test-whatsapp', async (req, res) => {
    const to = req.query.phoneNumber;
    const message = req.query.message || 'Test WhatsApp notification';
    if (!to) {
        return res.status(400).send('phoneNumber query param required');
    }
    try {
        await sendNotification(to, message);
        res.send(`Test WhatsApp notification sent to ${to}`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    const { username, email, password, phone_number } = req.body;
    if (!username || !email || !password || !phone_number) {
        return res.status(400).send('All fields are required');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });

        const sql = `INSERT INTO users (username, email, password_hash, phone_number, verification_token) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [username, email, hashedPassword, phone_number, verificationToken], async function (err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            const verificationLink = `http://localhost:5173/verify-email/${verificationToken}`;
            await sendEmail(
                email,
                'Verify your email',
                `<p>Please click <a href="${verificationLink}">here</a> to verify your email.</p>`
            );

            res.status(201).json({ message: 'User registered. Please check email to verify.' });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('All fields are required');

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).send('User not found');

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).send('Invalid credentials');

        if (!user.is_verified) {
            return res.status(403).send('Please verify your email first.');
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    });
});

// Logout endpoint (client clears token)
app.post('/api/logout', (req, res) => {
    // No server-side session to destroy for JWT; just respond OK
    res.json({ message: 'Logged out' });
});

// Verify Email
app.get('/api/verify-email/:token', (req, res) => {
    const { token } = req.params;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        db.run('UPDATE users SET is_verified = 1, verification_token = NULL WHERE email = ?', [decoded.email], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.send('Email verified successfully');
        });
    } catch (err) {
        res.status(400).send('Invalid or expired token');
    }
});

// Forgot Password
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).send('User not found');

        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        db.run('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', [resetToken, Date.now() + 3600000, user.id], async (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const resetLink = `http://localhost:5173/reset-password/${resetToken}`;
            await sendEmail(
                email,
                'Reset Password',
                `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
            );
            res.send('Password reset link sent');
        });
    });
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ? AND reset_token = ?', [hashedPassword, decoded.id, token], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(400).send('Invalid token');
            res.send('Password reset successfully');
        });
    } catch (err) {
        res.status(400).send('Invalid or expired token');
    }
});

// Get all learnings (Protected)
app.get('/api/learnings', auth, (req, res) => {
    db.all('SELECT * FROM learnings WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Add a new learning (Protected)
app.post('/api/learnings', auth, (req, res) => {
    const { content } = req.body; // Phone number taken from user profile
    if (!content) {
        res.status(400).json({ error: 'Content is required' });
        return;
    }

    const created_at = new Date().toISOString();
    const sql = 'INSERT INTO learnings (content, created_at, user_id) VALUES (?, ?, ?)';
    const params = [content, created_at, req.user.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: { id: this.lastID, content, created_at, user_id: req.user.id }
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startScheduler();
});
