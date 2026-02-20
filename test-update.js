require('dotenv').config({ path: '.env.local' });
const { flux } = require('./src/lib/flux/client.ts');

async function test() {
    try {
        const fetchRes = await flux.sql("SELECT * FROM members LIMIT 1");
        if (!fetchRes.rows || fetchRes.rows.length === 0) {
            console.log("No members found.");
            return;
        }
        const member = fetchRes.rows[0];
        console.log("Found member:", member);

        const updateQuery = `
      UPDATE members
        SET name = 'changed_again'
      WHERE id = '${member.id}'
    `;
        console.log("Running UPDATE:", updateQuery);
        const updateRes = await flux.sql(updateQuery);
        console.log("UPDATE result:", updateRes);

        const fetchUpdatedQuery = `
        SELECT m.id, m.name
        FROM members m
        LEFT JOIN plans p ON m.plan_id = p.id
        WHERE m.id = '${member.id}'
    `;
        console.log("Running SELECT:", fetchUpdatedQuery);
        const updatedResult = await flux.sql(fetchUpdatedQuery);
        console.log("SELECT result:", updatedResult);
    } catch (err) {
        console.error(err);
    }
}

test();
