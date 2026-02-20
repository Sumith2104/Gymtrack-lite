
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

class FluxClient {
    private apiUrl: string;
    private apiKey: string | undefined;
    private projectId: string | undefined;

    constructor() {
        this.apiUrl = process.env.NEXT_PUBLIC_FLUX_API_URL || 'https://fluxbase.vercel.app/api';
        this.apiKey = process.env.FLUX_API_KEY;
        this.projectId = process.env.FLUX_PROJECT_ID;
    }

    public async sql(query: string) {
        if (!this.apiKey || !this.projectId) throw new Error("Fluxbase credentials missing.");

        const endpoint = `${this.apiUrl.replace(/\/$/, '')}/execute-sql`;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({ query, projectId: this.projectId }),
                cache: 'no-store'
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`API Error ${res.status}: ${txt}`);
            }

            const data = await res.json();

            // Standardize return format
            if (data.result && Array.isArray(data.result.rows)) return data.result;
            if (data.rows) return data;

            return { rows: [], columns: [] };

        } catch (error) {
            console.error("FluxClient Request Failed:", error);
            throw error;
        }
    }
}

async function main() {
    const flux = new FluxClient();
    const email = 'sumith@gmail.com';
    const gymId = 'test';

    console.log(`Testing Auth Query for: ${email} / ${gymId}`);

    try {
        const query = `
          SELECT 
            id,
            name,
            owner_email,
            owner_user_id,
            formatted_gym_id,
            created_at,
            status,
            payment_id,
            session_time_hours,
            max_capacity
          FROM gyms
          WHERE owner_email = '${email}' 
          AND formatted_gym_id = '${gymId}'
        `;

        const result = await flux.sql(query);
        console.log("Result:", JSON.stringify(result, null, 2));

        if (result.rows && result.rows.length > 0) {
            console.log("✅ User FOUND!");
        } else {
            console.error("❌ User NOT FOUND (Result empty)");
        }

    } catch (e) {
        console.error("❌ Query Failed:", e);
    }
}

main();
