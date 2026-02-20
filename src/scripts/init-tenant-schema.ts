
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.local.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

import { SqlEngine } from '../lib/flux/sql-engine';

async function main() {
    // Get Gym ID from args
    const gymId = process.argv[2];
    if (!gymId) {
        console.error("❌ Please provide a Gym ID as an argument.");
        console.log("Usage: npx ts-node src/scripts/init-tenant-schema.ts <GYM_ID>");
        process.exit(1);
    }

    console.log(`Initializing Tenant Schema for Gym: ${gymId} (Scope: ${gymId}/main)...`);

    // Tenant Scope: UserId=gymId, ProjectId='main'
    const engine = new SqlEngine('main', gymId);

    try {
        // 1. Members Table
        console.log("Creating 'members' table...");
        await engine.execute(`
            CREATE TABLE members (
                id VARCHAR PRIMARY KEY,
                gym_id VARCHAR,
                plan_id VARCHAR,
                member_id VARCHAR,
                name VARCHAR,
                email VARCHAR,
                membership_status VARCHAR,
                membership_type VARCHAR,
                age INT,
                phone_number VARCHAR,
                join_date TIMESTAMP,
                expiry_date TIMESTAMP,
                created_at TIMESTAMP,
                profile_url VARCHAR
            );
        `);

        // 2. Plans Table
        console.log("Creating 'plans' table...");
        await engine.execute(`
            CREATE TABLE plans (
                id VARCHAR PRIMARY KEY,
                gym_id VARCHAR,
                plan_id VARCHAR,
                plan_name VARCHAR,
                price FLOAT,
                duration_months INT,
                is_active BOOLEAN
            );
        `);

        // 3. Check-ins Table
        console.log("Creating 'check_ins' table...");
        await engine.execute(`
            CREATE TABLE check_ins (
                id VARCHAR PRIMARY KEY,
                gym_id VARCHAR,
                member_table_id VARCHAR,
                check_in_time TIMESTAMP,
                check_out_time TIMESTAMP,
                created_at TIMESTAMP
            );
        `);

        // 4. Announcements Table
        console.log("Creating 'announcements' table...");
        await engine.execute(`
            CREATE TABLE announcements (
                id VARCHAR PRIMARY KEY,
                gym_id VARCHAR,
                formatted_gym_id VARCHAR,
                title VARCHAR,
                content VARCHAR,
                created_at TIMESTAMP
            );
        `);

        // 5. Messages Table
        console.log("Creating 'messages' table...");
        await engine.execute(`
            CREATE TABLE messages (
                id VARCHAR PRIMARY KEY,
                gym_id VARCHAR,
                formatted_gym_id VARCHAR,
                sender_id VARCHAR,
                receiver_id VARCHAR,
                sender_type VARCHAR,
                receiver_type VARCHAR,
                content VARCHAR,
                created_at TIMESTAMP,
                read_at TIMESTAMP
            );
        `);

        console.log(`✅ Tenant Schema Initialized for ${gymId}!`);

    } catch (error) {
        console.error("❌ Schema Initialization Failed:", error);
        process.exit(1);
    }
}

main();
