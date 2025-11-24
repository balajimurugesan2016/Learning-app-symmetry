const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sequelize, User, Learning } = require('../database');
const app = require('../server');

// Mock nodemailer to avoid sending real emails
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
    })
}));

// Mock scheduler to avoid starting cron jobs during tests
jest.mock('../scheduler', () => ({
    startScheduler: jest.fn()
}));

describe('Server Integration Tests', () => {
    beforeAll(async () => {
        // Sync database (create tables)
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        // Close database connection
        await sequelize.close();
    });

    beforeEach(async () => {
        // Clear data before each test
        await User.destroy({ where: {} });
        await Learning.destroy({ where: {} });
        jest.clearAllMocks();
    });

    describe('GET /api/unknown-route', () => {
        it('should return 404', async () => {
            const res = await request(app).get('/api/unknown-route');
            expect(res.statusCode).toEqual(404);
        });
    });

    describe('POST /api/register', () => {
        it('should return 400 if fields are missing', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({ username: 'test' }); // Missing other fields
            expect(res.statusCode).toEqual(400);
            expect(res.text).toContain('All fields are required');
        });

        it('should register user and send email if data is valid', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123',
                    phone_number: '1234567890'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toContain('User registered');

            // Verify user in DB
            const user = await User.findOne({ where: { email: 'test@example.com' } });
            expect(user).toBeDefined();
            expect(user.username).toBe('testuser');
            expect(user.verification_token).toBeDefined();
        });
    });

    describe('POST /api/login', () => {
        it('should return 400 if fields are missing', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ email: 'test@example.com' }); // Missing password
            expect(res.statusCode).toEqual(400);
            expect(res.text).toContain('All fields are required');
        });

        it('should return 401 if invalid credentials', async () => {
            // Create user first
            const hashedPassword = await bcrypt.hash('password123', 10);
            await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password_hash: hashedPassword,
                phone_number: '1234567890',
                is_verified: 1
            });

            const res = await request(app)
                .post('/api/login')
                .send({ email: 'test@example.com', password: 'wrong-password' });
            expect(res.statusCode).toEqual(401);
            expect(res.text).toContain('Invalid credentials');
        });

        it('should return 404 if user not found', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ email: 'nonexistent@example.com', password: 'password123' });
            expect(res.statusCode).toEqual(404);
            expect(res.text).toContain('User not found');
        });

        it('should return 403 if user is not verified', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password_hash: hashedPassword,
                phone_number: '1234567890',
                is_verified: 0 // Not verified
            });

            const res = await request(app)
                .post('/api/login')
                .send({ email: 'test@example.com', password: 'password123' });
            expect(res.statusCode).toEqual(403);
            expect(res.text).toContain('Please verify your email first.');
        });

        it('should return 200 if login is successful', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password_hash: hashedPassword,
                phone_number: '1234567890',
                is_verified: 1
            });

            const res = await request(app)
                .post('/api/login')
                .send({ email: 'test@example.com', password: 'password123' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('test@example.com');
        });
    });

    describe('GET /api/learnings', () => {
        it('should return 401/403 if not authenticated', async () => {
            const res = await request(app).get('/api/learnings');
            expect([401, 403]).toContain(res.statusCode);
        });

        it('should return learnings for authenticated user', async () => {
            // Create user
            const user = await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password_hash: 'hash',
                phone_number: '1234567890',
                is_verified: 1
            });

            // Create learning
            await Learning.create({
                content: 'Test Learning',
                created_at: new Date().toISOString(),
                user_id: user.id
            });

            // Generate token
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

            const res = await request(app)
                .get('/api/learnings')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].content).toBe('Test Learning');
        });
    });
});
