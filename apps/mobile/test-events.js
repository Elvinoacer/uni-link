const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const API_URL = 'http://localhost:3000/api';

const TEST_USER = {
    email: 'test_script_user@example.com', 
    password: 'password123'
};

/* 
   Run with: node test-events.js
*/

async function testEvents() {
    try {
        console.log(`Testing against API: ${API_URL}`);

        // 1. Login
        console.log('1. Logging in...');
        let token = '';
        try {
             const loginRes = await axios.post(`${API_URL}/auth/login`, TEST_USER);
             token = loginRes.data.data.accessToken;
             console.log('   Login successful.');
        } catch (e) {
             console.log('   Login failed. Trying to register...');
             try {
                await axios.post(`${API_URL}/auth/register`, { ...TEST_USER, username: 'tester_script' });
                const loginRes = await axios.post(`${API_URL}/auth/login`, TEST_USER);
                token = loginRes.data.data.accessToken;
                console.log('   Registration & Login successful.');
             } catch (regErr) {
                 console.error('   Registration failed:', regErr.response?.data || regErr.message);
                 return;
             }
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Fetch My Events FIRST to test Auth
        console.log('2. Fetching MY Events (/events/my)...');
        try {
            const getMyRes = await axios.get(`${API_URL}/events/my`, { headers });
            console.log('   Fetch Success. Status:', getMyRes.status);
            console.log('   Data:', JSON.stringify(getMyRes.data, null, 2));
        } catch (e) {
            console.error('   Fetch Failed:', e.response?.status, e.response?.data);
        }

        // 3. Create Event
        console.log('3. Creating Event...');
        const now = new Date();
        const eventData = {
            title: `Script Event ${Date.now()}`,
            description: 'This is a test event created by script',
            location: 'Script Location',
            startsAt: now.toISOString(),
            endsAt: new Date(now.getTime() + 3600000).toISOString(),
            category: 'academic',
            imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f'
        };

        try {
            const createRes = await axios.post(`${API_URL}/events`, eventData, { headers });
            console.log('   Create Event Response Status:', createRes.status);
            const eventId = createRes.data.data.id;
            console.log('   Created Event ID:', eventId);

            // 4. Verify Creation
            console.log('4. Verifying Creation...');
            const getMyRes2 = await axios.get(`${API_URL}/events/my`, { headers });
            const myEvents = getMyRes2.data.data || getMyRes2.data;
            const found = Array.isArray(myEvents) && myEvents.find(e => e.id === eventId);
             if (found) {
                console.log('   ✅ SUCCESS: Created event found in /events/my');
            } else {
                console.log('   ❌ FAILURE: Created event NOT found in /events/my');
            }

        } catch (e) {
             console.error('   Create Event Failed:', e.response?.status, e.response?.data);
        }

    } catch (error) {
        console.error('Unexpected Error:', error.response?.data || error.message);
    }
}

testEvents();
