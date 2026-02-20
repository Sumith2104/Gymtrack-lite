import dotenv from 'dotenv';
dotenv.config({ path: '.local.env' });
dotenv.config({ path: '.env' });

const FLUX_API_KEY = process.env.FLUX_API_KEY;
const FLUX_API_URL = process.env.NEXT_PUBLIC_FLUX_API_URL;

async function query(sql) {
    const response = await fetch(`${FLUX_API_URL}/api/execute-sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FLUX_API_KEY}`
        },
        body: JSON.stringify({ query: sql })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
}

async function debugEditMember() {
    const memberOriginalDbId = '0ce74a40-27ab-41f9-873b-53605c734bb5';

    // hardcode a gym ID, you should find sumith's gym ID
    const gymsRes = await query(`SELECT id FROM gyms WHERE name = 'test' LIMIT 1`);
    if (!gymsRes.rows || gymsRes.rows.length === 0) {
        console.log("No gym found");
        return;
    }
    const gymDatabaseId = gymsRes.rows[0].id;

    console.log("1. Fetching member with original ID...");
    let existingMemberQuery = `
      SELECT id, join_date, member_id, membership_status 
      FROM members 
      WHERE id = '${memberOriginalDbId}' 
      AND gym_id = '${gymDatabaseId}'
    `;
    let existingMemberResult = await query(existingMemberQuery);

    if (!existingMemberResult.rows || existingMemberResult.rows.length === 0) {
        console.log("2. Original ID not found, trying fallback...");
        const fallbackQuery = `
        SELECT id, join_date, member_id, membership_status 
        FROM members 
        WHERE plan_id = '${memberOriginalDbId}' 
        AND gym_id = '${gymDatabaseId}'
        LIMIT 1
      `;
        const fallbackResult = await query(fallbackQuery);

        if (!fallbackResult.rows || fallbackResult.rows.length === 0) {
            console.log("Fallback failed.");
            return;
        }
        existingMemberResult = fallbackResult;
    }

    const existingMember = existingMemberResult.rows[0];
    const actualMemberDbId = existingMember.id;
    console.log("3. Actual Member DB ID:", actualMemberDbId);

    console.log("4. Simulating fetch of updated member...");
    const fetchUpdatedQuery = `
        SELECT 
          m.id, m.gym_id, m.plan_id, m.member_id, m.name, m.email, m.phone_number, m.age, 
          m.membership_status, m.membership_type, m.join_date, m.expiry_date, m.created_at, m.profile_url,
          p.plan_name, p.price, p.duration_months
        FROM members m
        LEFT JOIN plans p ON m.plan_id = p.id
        WHERE m.id = '${actualMemberDbId}'
    `;
    const updatedResult = await query(fetchUpdatedQuery);
    console.log("5. Updated Result Rows:", updatedResult.rows?.length, updatedResult.rows);
}

debugEditMember().catch(console.error);
