import 'server-only';

export class FluxClient {
    private apiUrl: string;
    private apiKey: string | undefined;
    private projectId: string | undefined;

    constructor() {
        this.apiUrl = process.env.NEXT_PUBLIC_FLUX_API_URL || 'https://fluxbase.vercel.app/api';
        this.apiKey = process.env.FLUX_API_KEY;
        this.projectId = process.env.FLUX_PROJECT_ID;

        if (!this.apiKey) {
            console.warn("⚠️ FLUX_API_KEY is missing from environment variables.");
        }
        if (!this.projectId) {
            console.warn("⚠️ FLUX_PROJECT_ID is missing from environment variables.");
        }
    }

    /**
     * Executes a SQL query against the Hosted Fluxbase API.
     * @param query The SQL query to execute
     * @param scope Optional scope string (ignored in single-project hosted mode)
     */
    public async sql(query: string, scope?: string) {
        if (!this.apiKey || !this.projectId) {
            throw new Error("Fluxbase credentials missing. Check .env file.");
        }

        // Based on source check, the route is src/app/api/execute-sql/route.ts
        const endpoint = `${this.apiUrl.replace(/\/$/, '')}/execute-sql`;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    query: query,
                    projectId: this.projectId
                }),
                cache: 'no-store'
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Fluxbase API Error (${res.status}): ${errText}`);
            }

            const data = await res.json();

            // Standardize return format
            // If the API returns { result: { rows: ... } }, unwrap it.
            if (data.result && Array.isArray(data.result.rows)) {
                return data.result;
            }

            // Fallback: Checks if rows exists at top level (e.g. direct adapter)
            if (data.rows) {
                return data;
            }

            // If we have data but no rows, return empty structure to avoid crashes
            return { rows: [], columns: [] };

        } catch (error) {
            console.error("FluxClient Request Failed:", error);
            throw error;
        }
    }
}

export const flux = new FluxClient();
