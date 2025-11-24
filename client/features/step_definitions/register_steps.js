import { Given, When, Then, After } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import axios from 'axios';

Given('I click on the register link', async function () {
     await this.page.click('text=Register');
});

Then('I should see the register page', async function () {
    await expect(this.page).toHaveURL('http://localhost:5173/register');
});

Then('I fill the register form with username "geninia", email "geninia@gmail.com" and password "password123" and whatsapp number "+251912345678"', async function () {
    await this.page.fill('input[name="username"]', 'geninia');
    await this.page.fill('input[name="email"]', 'geninia@gmail.com');
    await this.page.fill('input[name="password"]', 'password123');
    await this.page.fill('input[name="phone_number"]', '+251912345678');
    // Store username for cleanup
    this.registeredUsername = 'geninia';
});

Then('I click on the register button', async function () {
    await this.page.click('button[type="submit"]');
});

Then('I should see a message {string}', async function (message) {
    await expect(this.page).toHaveText(message);
});

After(async function () {
    if (this.registeredUsername) {
        try {
            await axios.delete(`${process.env.API_URL || 'http://localhost:3000'}/api/users/${this.registeredUsername}`);
        } catch (err) {
            console.error('Cleanup delete user failed:', err.message);
        }
    }
});