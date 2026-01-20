import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'; // Default fallback

// MOCK USER LOGIN (We need a token to test authorized endpoints)
// We'll assume we can use a hardcoded test user credential or just try to hit endpoints if auth is not strictly enforced for reading,
// but 'my' events definitely needs auth.
// We need to login first.

const TEST_USER = {
    email: 'test@example.com', // REPLACE WITH VALID USER IF NEEDED
    password: 'password123'
};

/* 
   NOTE: If you don't have a known test user, this script might fail at login.
   Please ensure 'test@example.com' exists or update the credentials below.
   Or run this script and see if it fails at login.
*/

async function testEvents() {
    try {
        console.log(`Testing against API: ${API_URL}`);

        // 1. Login
        console.log('1. Logging in...');
        // We'll try to register first to ensure user exists, or just login
        let token = '';
        try {
             // Try login
             const loginRes = await axios.post(`${API_URL}/auth/login`, TEST_USER);
             token = loginRes.data.data.accessToken;
             console.log('   Login successful.');
        } catch (e) {
             console.log('   Login failed. Trying to register...');
             try {
                await axios.post(`${API_URL}/auth/register`, { ...TEST_USER, username: 'tester' });
                const loginRes = await axios.post(`${API_URL}/auth/login`, TEST_USER);
                token = loginRes.data.data.accessToken;
                console.log('   Registration & Login successful.');
             } catch (regErr: any) {
                 console.error('   Registration failed:', regErr.response?.data || regErr.message);
                 return;
             }
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Create Event
        console.log('2. Creating Event...');
        const now = new Date();
        const eventData = {
            title: `Test Event ${Date.now()}`,
            description: 'This is a test event created by script',
            location: 'Test Location',
            startsAt: now.toISOString(),
            endsAt: new Date(now.getTime() + 3600000).toISOString(),
            category: 'academic',
            imageUrl: 'https://example.com/image.jpg'
        };

        const createRes = await axios.post(`${API_URL}/events`, eventData, { headers });
        console.log('   Create Event Response:', createRes.status, createRes.data);
        const eventId = createRes.data.data.id;

        // 3. Get All Events
        console.log('3. Fetching All Events...');
        const getAllRes = await axios.get(`${API_URL}/events`, { headers });
        console.log('   Get All Events Count:', getAllRes.data.length || getAllRes.data.data?.length);
        
        // 4. Get My Events
        console.log('4. Fetching MY Events (/events/my)...');
        try {
            const getMyRes = await axios.get(`${API_URL}/events/my`, { headers });
            console.log('   Get My Events Response:', JSON.stringify(getMyRes.data, null, 2));
            
            const myEvents = getMyRes.data.data || getMyRes.data;
            const found = Array.isArray(myEvents) && myEvents.find((e: any) => e.id === eventId);
            
            if (found) {
                console.log('   ✅ SUCCESS: Created event found in /events/my');
            } else {
                console.log('   ❌ FAILURE: Created event NOT found in /events/my');
            }

        } catch (e: any) {
            console.error('   Error fetching /events/my:', e.response?.status, e.response?.data);
        }

        // Cleanup (Optional)
        // await axios.delete(`${API_URL}/events/${eventId}`, { headers });

    } catch (error: any) {
        console.error('Unexpected Error:', error.response?.data || error.message);
    }
}

testEvents();
