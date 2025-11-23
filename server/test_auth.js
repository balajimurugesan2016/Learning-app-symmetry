const API_URL = 'http://localhost:3000/api';

const runTest = async () => {
    try {
        const username = `user_${Date.now()}`;
        const email = `${username}@example.com`;
        const password = 'password123';
        const phone_number = '+1234567890';

        console.log('1. Registering user...');
        const regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, phone_number })
        });
        if (!regRes.ok) throw new Error(await regRes.text());
        console.log('   Success');

        console.log('2. Logging in...');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!loginRes.ok) throw new Error(await loginRes.text());
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('   Success. Token received.');

        console.log('3. Adding learning...');
        const addRes = await fetch(`${API_URL}/learnings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: 'Testing auth flow' })
        });
        if (!addRes.ok) throw new Error(await addRes.text());
        const addData = await addRes.json();
        console.log('   Success. Learning ID:', addData.data.id);

        console.log('4. Fetching learnings...');
        const fetchRes = await fetch(`${API_URL}/learnings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!fetchRes.ok) throw new Error(await fetchRes.text());
        const fetchData = await fetchRes.json();
        console.log('   Success. Count:', fetchData.data.length);

        console.log('ALL TESTS PASSED');
    } catch (error) {
        console.error('TEST FAILED:', error);
    }
};

runTest();
