
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.local.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Manually register ts-node if running directly without it (though npx ts-node usually handles it)
// We import from src/lib/flux
// Since we are running with ts-node, we can import .ts files directly.

import { SqlEngine } from '../lib/flux/sql-engine';

async function main() {
    console.log("Initializing System Schema (Scope: system/main)...");

    // System Scope: UserId='system', ProjectId='main'
    const engine = new SqlEngine('main', 'system');

    try {
        // 1. Gyms Table
        console.log("Creating 'gyms' table...");
        await engine.execute(`
            CREATE TABLE gyms (
                id VARCHAR PRIMARY KEY,
                name VARCHAR,
                owner_email VARCHAR,
                owner_user_id VARCHAR,
                formatted_gym_id VARCHAR,
                status VARCHAR,
                created_at TIMESTAMP,
                payment_id VARCHAR,
                app_email VARCHAR,
                app_pass VARCHAR,
                app_host VARCHAR,
                from_email VARCHAR,
                port VARCHAR,
                session_time_hours INT,
                max_capacity INT
            );
        `);
        // Note: Unique constraints logic in Engine is basic. We rely on App logic or manually adding constraints if supported.
        // formatted_gym_id should be unique.

        // 2. Super Admins Table
        console.log("Creating 'super_admins' table...");
        await engine.execute(`
            CREATE TABLE super_admins (
                id VARCHAR PRIMARY KEY,
                email VARCHAR,
                password_hash VARCHAR,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                smtp_username VARCHAR,
                smtp_pass VARCHAR,
                smtp_host VARCHAR,
                smtp_from VARCHAR,
                smtp_port VARCHAR
            );
        `);

        // 3. Gym Requests Table
        console.log("Creating 'gym_requests' table...");
        await engine.execute(`
            CREATE TABLE gym_requests (
                id VARCHAR PRIMARY KEY,
                gym_name VARCHAR,
                owner_name VARCHAR,
                email VARCHAR,
                phone VARCHAR,
                city VARCHAR,
                status VARCHAR,
                created_at TIMESTAMP
            );
        `);

        console.log("✅ System Schema Initialized Successfully!");

    } catch (error) {
        console.error("❌ Schema Initialization Failed:", error);
        process.exit(1);
    }
}

main();
