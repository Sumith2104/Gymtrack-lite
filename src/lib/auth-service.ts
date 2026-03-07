import { cookies } from 'next/headers';

export interface ServerSession {
    isAuthenticated: boolean;
    gymId: string | null;
    gymDatabaseId: string | null;
    gymName: string | null;
}

export async function getServerSession(): Promise<ServerSession> {
    const cookieStore = await cookies();

    const isAuthenticated = cookieStore.get('auth_authenticated')?.value === 'true';
    const gymId = cookieStore.get('auth_gym_id')?.value || null;
    const gymDatabaseId = cookieStore.get('auth_gym_db_id')?.value || null;
    const gymName = cookieStore.get('auth_gym_name')?.value || null;

    return {
        isAuthenticated,
        gymId,
        gymDatabaseId,
        gymName,
    };
}
