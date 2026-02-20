import { fetchMembers } from '../src/app/actions/member-actions';

async function testFetchMembers() {
    // Replace with a valid gym ID from your database
    const gymId = 'gym_123'; // Logic to get a real gym ID might be needed
    console.log(`Fetching members for gym: ${gymId}`);

    try {
        const result = await fetchMembers(gymId);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error fetching members:', error);
    }
}

// Check if we can get a gym ID first
import { flux } from '../src/lib/flux/client';

async function main() {
    try {
        const gyms = await flux.sql("SELECT id FROM gyms LIMIT 1");
        if (gyms.rows.length > 0) {
            const gymId = gyms.rows[0].id;
            await testFetchMembers(gymId);
        } else {
            console.log("No gyms found in DB.");
        }
    } catch (e) {
        console.error("DB Connection failed:", e);
    }
}

main();
