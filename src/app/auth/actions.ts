
'use server';

import { flux } from '@/lib/flux/client';
import type { Gym } from '@/lib/types';
import { cookies } from 'next/headers';

export async function verifyGymOwnerCredentials(
  email: string,
  gymId: string
): Promise<Gym | 'inactive' | 'not_found'> {

  try {
    // Sanitize inputs trivially to prevent basic injection
    const safeEmail = email.replace(/'/g, "''");
    const safeGymId = gymId.replace(/'/g, "''");

    const result = await flux.sql(`
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
      WHERE owner_email = '${safeEmail}' 
      AND formatted_gym_id = '${safeGymId}'
    `); // Single Tenant

    console.log("Flux Auth Query Result:", JSON.stringify(result, null, 2));

    if (!result.rows || result.rows.length === 0) {
      return 'not_found';
    }

    const data = result.rows[0];

    if (data.status === 'inactive') {
      return 'inactive';
    }

    // Set secure HTTP-only cookies for server-side auth
    const cookieStore = await cookies();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    cookieStore.set('auth_authenticated', 'true', { maxAge: oneWeek, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('auth_gym_id', data.formatted_gym_id, { maxAge: oneWeek, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('auth_gym_db_id', data.id, { maxAge: oneWeek, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('auth_gym_name', data.name, { maxAge: oneWeek, httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return {
      id: data.id,
      name: data.name,
      ownerEmail: data.owner_email,
      ownerUserId: data.owner_user_id,
      formattedGymId: data.formatted_gym_id,
      createdAt: data.created_at,
      status: data.status,
      payment_id: data.payment_id,
      sessionTimeHours: data.session_time_hours,
      maxCapacity: data.max_capacity,
    };

  } catch (e: any) {
    console.error("Auth Error:", e);
    return 'not_found';
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_authenticated');
  cookieStore.delete('auth_gym_id');
  cookieStore.delete('auth_gym_db_id');
  cookieStore.delete('auth_gym_name');
}
