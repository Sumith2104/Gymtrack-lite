
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Gym } from '@/lib/types';

export async function verifyGymOwnerCredentials(
  email: string,
  gymId: string 
): Promise<Gym | 'inactive' | 'not_found'> {
  
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
        status,
        payment_id,
        session_time_hours,
        max_capacity
      `
      )
      .eq('owner_email', email)
      .eq('formatted_gym_id', gymId) 
      .single();

    if (error || !data) {
      if (error && error.code === 'PGRST116') { 
        return 'not_found';
      }
      return 'not_found';
    }

    if (data.status === 'inactive') {
      return 'inactive';
    }
      
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
    return 'not_found';
  }
}
