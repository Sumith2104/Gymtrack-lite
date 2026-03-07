import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env' });

async function test() {
    const gymId = 'a6e25ae2-6c16-4edd-8f0d-99ea7534f061';
    const senderId = '26SSUMI3210G';
    const receiverId = 'test';
    const senderType = 'member';
    const receiverType = 'admin';
    const content = 'Test message';
    const formattedGymId = 'test';
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const query = `SELECT * FROM messages LIMIT 2`;

    const queryInsert = `
      INSERT INTO messages (id, gym_id, sender_id, receiver_id, sender_type, receiver_type, content, formatted_gym_id, created_at)
      VALUES (
        '${id}',
        '${gymId}',
        '${senderId}',
        '${receiverId}',
        '${senderType}',
        '${receiverType}',
        '${content}',
        '${formattedGymId}',
        '${createdAt}'
      )
  `;

    console.log("Running Query:", query);

    // Fallback since the env is slightly different in the admin dashboard
    const apiUrl = process.env.NEXT_PUBLIC_FLUX_API_URL || 'https://fluxbase.vercel.app/api';
    const apiKey = process.env.FLUX_API_KEY || 'flux_6e138be5a0e53a5105cfc66289bcafdaec68d83387eb7720d2d312ddde35dc22';
    const projectId = process.env.FLUX_PROJECT_ID || '14df1bc8-f682-41ba-87b4-368ab22c9a91';

    const endpoint = `${apiUrl.replace(/\/$/, '')}/execute-sql`;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                query: query,
                projectId: projectId
            })
        });

        const data = await res.json();
        console.log("Raw Response Select:", JSON.stringify(data, null, 2));

        const res2 = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                query: queryInsert,
                projectId: projectId
            })
        });

        const data2 = await res2.json();

        const output = {
            selectResponse: data,
            insertResponse: data2
        };
        fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
        console.log("Wrote responses to output.json");

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

test();
