
// src/app/auth/actions.ts
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Gym } from '@/lib/types';

export async function verifyGymOwnerCredentials(
  email: string,
  gymId: string // This should be the formatted_gym_id
): Promise<Gym | null> {
  console.log(`[verifyGymOwnerCredentials] Attempting to verify: email='${email}', gymId='${gymId}'`);
  const supabase = createSupabaseServerActionClient();

  try {
    const { data, error } = await supabase
      .from('gyms')
      .select(
        `
        id,
        name,
        owner_email,
        owner_user_id,
        formatted_gym_id,
        created_at,
        status
      `
      )
      .eq('owner_email', email)
      .eq('formatted_gym_id', gymId) // Ensure this matches the column name and value precisely
      .single();

    if (error) {
      console.error('[verifyGymOwnerCredentials] Error verifying credentials:', error.message);
      if (error.code === 'PGRST116') { // PGRST116 means "Not a single row" (e.g. 0 rows or more than 1)
         console.log('[verifyGymOwnerCredentials] No gym found matching criteria or multiple matches (should be unique).');
      }
      return null;
    }

    if (data) {
      console.log(`[verifyGymOwnerCredentials] Gym found: ${data.name}, Formatted ID: ${data.formatted_gym_id}`);
      // Map snake_case to camelCase
      return {
        id: data.id,
        name: data.name,
        ownerEmail: data.owner_email,
        ownerUserId: data.owner_user_id,
        formattedGymId: data.formatted_gym_id,
        createdAt: data.created_at,
        status: data.status,
      };
    }
    console.log('[verifyGymOwnerCredentials] No data returned from query, though no explicit error.');
    return null;
  } catch (e: any) {
    console.error('[verifyGymOwnerCredentials] Unexpected error:', e.message);
    return null;
  }
}
