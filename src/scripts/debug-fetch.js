const fs = require('fs');

(async () => {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const envLocalContent = fs.readFileSync('.local.env', 'utf-8');

    const extractVar = (name, content) => {
        const match = content.match(new RegExp(`${name}=(.+)`));
        return match ? match[1].trim() : null;
    };

    const apiKey = extractVar('FLUX_API_KEY', envContent) || extractVar('FLUX_API_KEY', envLocalContent);
    const apiUrl = extractVar('NEXT_PUBLIC_FLUX_API_URL', envContent) || extractVar('NEXT_PUBLIC_FLUX_API_URL', envLocalContent);

    async function query(sql) {
        const res = await fetch(`${apiUrl}/api/execute-sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ query: sql })
        });
        return res.json();
    }

    const memberOriginalDbId = '0ce74a40-27ab-41f9-873b-53605c734bb5';
    const gymsRes = await query(`SELECT id FROM gyms WHERE name = 'test' LIMIT 1`);
    const gymDatabaseId = gymsRes.rows[0].id;

    let existingMemberQuery = `SELECT id, join_date, member_id, membership_status FROM members WHERE id = '${memberOriginalDbId}' AND gym_id = '${gymDatabaseId}'`;
    let existingMemberResult = await query(existingMemberQuery);

    console.log("Original result:", JSON.stringify(existingMemberResult.rows));

    if (!existingMemberResult.rows || existingMemberResult.rows.length === 0) {
        console.log("Using fallback...");
        const fallbackQuery = `SELECT id, join_date, member_id, membership_status FROM members WHERE plan_id = '${memberOriginalDbId}' AND gym_id = '${gymDatabaseId}' LIMIT 1`;
        existingMemberResult = await query(fallbackQuery);
        console.log("Fallback result:", JSON.stringify(existingMemberResult.rows));
    }

    if (!existingMemberResult.rows || existingMemberResult.rows.length === 0) {
        console.log("Failed completely.");
        return;
    }

    const existingMember = existingMemberResult.rows[0];
    const actualMemberDbId = existingMember.id;
    console.log("actualMemberDbId:", actualMemberDbId);

    const fetchUpdatedQuery = `
      SELECT m.id, p.plan_name 
      FROM members m 
      LEFT JOIN plans p ON m.plan_id = p.id 
      WHERE m.id = '${actualMemberDbId}'
  `;
    const updatedResult = await query(fetchUpdatedQuery);
    console.log("Updated result:", JSON.stringify(updatedResult.rows));
})().catch(console.error);
