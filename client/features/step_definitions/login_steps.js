import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import axios from 'axios';

Given('a verified user exists with email {string} and password {string}', async function (email, password) {
    try {
        await axios.post('http://localhost:3000/api/test/create-user', {
            username: 'Test User',
            email,
            password
        });
    } catch (error) {
        // Ignore if user already exists (or handle better)
        console.log('User creation failed (might already exist):', error.message);
    }
});

Given('I am on the login page', async function () {
    await this.page.goto('http://localhost:5173/login');
});

When('I login with email {string} and password {string}', async function (email, password) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
});

Then('I should see the dashboard', async function () {
    // Wait for navigation to root
    await expect(this.page).toHaveURL('http://localhost:5173/');

});


