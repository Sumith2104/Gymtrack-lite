// src/app/auth/actions.ts
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Gym } from '@/lib/types';

export async function verifyGymOwnerCredentials(
  email: string,
  gymId: string
): Promise<Gym | null> {
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
      .eq('formatted_gym_id', gymId)
      .single();

    if (error) {
      console.error('Error verifying gym owner credentials:', error.message);
      if (error.code === 'PGRST116') { // PGRST116 means "Not a single row" (e.g. 0 rows)
         console.log('No gym found matching criteria.');
      }
      return null;
    }

    if (data) {
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
    return null;
  } catch (e) {
    console.error('Unexpected error in verifyGymOwnerCredentials:', e);
    return null;
  }
}
