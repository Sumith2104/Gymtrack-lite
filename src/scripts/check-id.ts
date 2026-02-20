import { flux } from '@/lib/flux/client';

async function checkId() {
    const id = '0ce74a40-27ab-41f9-873b-53605c734bb5';
    console.log("Checking ID:", id);

    const memberRes = await flux.sql(`SELECT id, name FROM members WHERE id = '${id}'`);
    console.log("Member result:", memberRes.rows);

    const planRes = await flux.sql(`SELECT id, plan_name FROM plans WHERE id = '${id}'`);
    console.log("Plan result:", planRes.rows);
}

checkId().catch(console.error);
