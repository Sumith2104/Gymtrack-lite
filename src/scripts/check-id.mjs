import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.local.env' });
dotenv.config({ path: '.env' });

const FLUX_API_KEY = process.env.FLUX_API_KEY;
const FLUX_PROJECT_ID = process.env.FLUX_PROJECT_ID;
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
    return response.json();
}

async function checkId() {
    const id = '0ce74a40-27ab-41f9-873b-53605c734bb5';
    console.log("Checking ID:", id);

    const memberRes = await query(`SELECT id, name FROM members WHERE id = '${id}'`);
    console.log("Member result:", memberRes);

    const planRes = await query(`SELECT id, plan_name FROM plans WHERE id = '${id}'`);
    console.log("Plan result:", planRes);
}

checkId().catch(console.error);
