const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { User, Learning } = require('./database');
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

// Test Endpoint: Create Verified User
app.post('/api/test/create-user', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            email,
            password_hash: hashedPassword,
            phone_number: '1234567890',
            is_verified: 1
        });
        res.status(201).json(user);
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

        await User.create({
            username,
            email,
            password_hash: hashedPassword,
            phone_number,
            verification_token: verificationToken
        });

        const verificationLink = `http://localhost:5173/verify-email/${verificationToken}`;
        await sendEmail(
            email,
            'Verify your email',
            `<p>Please click <a href="${verificationLink}">here</a> to verify your email.</p>`
        );

        res.status(201).json({ message: 'User registered. Please check email to verify.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('All fields are required');

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).send('User not found');

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).send('Invalid credentials');

        if (!user.is_verified) {
            return res.status(403).send('Please verify your email first.');
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Logout endpoint (client clears token)
app.post('/api/logout', (req, res) => {
    // No server-side session to destroy for JWT; just respond OK
    res.json({ message: 'Logged out' });
});

// Verify Email
app.get('/api/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await User.update(
            { is_verified: 1, verification_token: null },
            { where: { email: decoded.email } }
        );
        res.send('Email verified successfully');
    } catch (err) {
        res.status(400).send('Invalid or expired token');
    }
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).send('User not found');

        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const resetTokenExpiry = Date.now() + 3600000;

        await User.update(
            { reset_token: resetToken, reset_token_expiry: resetTokenExpiry },
            { where: { id: user.id } }
        );

        const resetLink = `http://localhost:5173/reset-password/${resetToken}`;
        await sendEmail(
            email,
            'Reset Password',
            `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
        );
        res.send('Password reset link sent');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [updatedCount] = await User.update(
            { password_hash: hashedPassword, reset_token: null, reset_token_expiry: null },
            { where: { id: decoded.id, reset_token: token } }
        );

        if (updatedCount === 0) return res.status(400).send('Invalid token');
        res.send('Password reset successfully');
    } catch (err) {
        res.status(400).send('Invalid or expired token');
    }
});

// Get all learnings (Protected)
app.get('/api/learnings', auth, async (req, res) => {
    try {
        const learnings = await Learning.findAll({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']]
        });
        res.json({ data: learnings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new learning (Protected)
app.post('/api/learnings', auth, async (req, res) => {
    const { content } = req.body;
    if (!content) {
        res.status(400).json({ error: 'Content is required' });
        return;
    }

    const created_at = new Date().toISOString();
    try {
        const learning = await Learning.create({
            content,
            created_at,
            user_id: req.user.id
        });
        res.json({
            message: 'success',
            data: learning
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        startScheduler();
    });
}

module.exports = app;
