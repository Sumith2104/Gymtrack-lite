
import { NextResponse } from 'next/server';
import { flux } from '@/lib/flux/client';

export async function GET(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Migration only allowed in development' }, { status: 403 });
    }

    try {
        console.log("Initializing System Schema via Hosted API...");

        // 1. Gyms Table
        await flux.sql(`
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

        // 2. Super Admins Table
        await flux.sql(`
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
        await flux.sql(`
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

        console.log("✅ System Schema Initialized Successfully (Hosted)!");
        return NextResponse.json({ success: true, message: 'System Schema Initialized' });

    } catch (error: any) {
        console.error("Migration Failed (Detailed):", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
