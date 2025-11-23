const fetch = require('node-fetch'); // Node >=18 has global fetch; keep for older versions
require('dotenv').config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const FROM = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER; // e.g., whatsapp:+4915112345678

/**
 * Sends a WhatsApp message via Meta's Cloud API.
 * @param {string} to      Destination phone number (include country code, e.g. +4915112345678)
 * @param {string} message Text to send
 */
const sendNotification = async (to, message) => {
    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

    const payload = {
        messaging_product: 'whatsapp',
        to, // recipient number without the "whatsapp:" prefix
        type: 'text',
        text: { body: message },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        const errMsg = data.error?.message || JSON.stringify(data);
        console.error(`❌ WhatsApp send failed: ${errMsg}`);
        throw new Error(errMsg);
    }

    console.log(`✅ WhatsApp sent to ${to}: ${message}`);
};

module.exports = { sendNotification };
