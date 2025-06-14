
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Member, FormattedCheckIn, CheckIn, MemberWithPlanDetails } from '@/lib/types'; // CheckIn for DB record type

// Helper to map DB row to Member type (similar to member-actions)
function mapDbMemberToAppMember(dbMember: any): Member { // any because Supabase client returns object for joined tables
  const planDetails = dbMember.plans; // From join: members(*, plans(*))
  return {
    id: dbMember.id,
    gymId: dbMember.gym_id,
    planId: dbMember.plan_id,
    memberId: dbMember.member_id,
    name: dbMember.name,
    email: dbMember.email,
    membershipStatus: dbMember.membership_status,
    createdAt: dbMember.created_at,
    age: dbMember.age,
    phoneNumber: dbMember.phone_number,
    joinDate: dbMember.join_date,
    expiryDate: dbMember.expiry_date,
    membershipType: planDetails?.plan_name || 'Other',
    planPrice: planDetails?.price || 0,
  };
}


export async function findMemberForCheckInAction(identifier: string, gymDatabaseId: string): Promise<{ member?: Member; error?: string }> {
  if (!identifier || !gymDatabaseId) {
    return { error: "Member identifier and Gym ID are required." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: dbMember, error } = await supabase
      .from('members')
      .select('*, plans(plan_name, price, duration_months)') // Join with plans
      .eq('member_id', identifier)
      .eq('gym_id', gymDatabaseId)
      .single();

    if (error) {
      console.error('Error finding member for check-in:', error.message);
      if (error.code === 'PGRST116') return { error: "Member not found at this gym."} // Not a single row
      return { error: error.message };
    }
    if (!dbMember) {
        return { error: "Member not found at this gym." };
    }
    
    const member = mapDbMemberToAppMember(dbMember);
    return { member };

  } catch (e: any) {
    console.error('Unexpected error in findMemberForCheckInAction:', e.message);
    return { error: 'An unexpected error occurred while finding the member.' };
  }
}

export async function recordCheckInAction(memberTableUuid: string, gymDatabaseId: string): Promise<{ success: boolean; checkInTime?: string; error?: string }> {
  if (!memberTableUuid || !gymDatabaseId) {
    return { success: false, error: "Member UUID and Gym ID are required to record check-in." };
  }
  const supabase = createSupabaseServerActionClient();
  const checkInTime = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('check_ins')
      .insert({
        member_table_id: memberTableUuid,
        gym_id: gymDatabaseId,
        check_in_time: checkInTime,
      });

    if (error) {
      console.error('Error recording check-in:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, checkInTime };

  } catch (e: any) {
    console.error('Unexpected error in recordCheckInAction:', e.message);
    return { success: false, error: 'An unexpected error occurred while recording the check-in.' };
  }
}


export async function fetchTodaysCheckInsForKioskAction(gymDatabaseId: string, gymName: string): Promise<{ checkIns: FormattedCheckIn[]; error?: string }> {
  if (!gymDatabaseId) return { checkIns: [], error: "Gym ID is required." };

  const supabase = createSupabaseServerActionClient();
  const today = new Date();
  const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999)).toISOString();

  try {
    const { data: dbCheckIns, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        members (
          name,
          member_id 
        )
      `)
      .eq('gym_id', gymDatabaseId)
      .gte('check_in_time', startOfDay)
      .lte('check_in_time', endOfDay)
      .order('check_in_time', { ascending: false });

    if (error) {
      console.error('Error fetching today\'s check-ins:', error.message);
      return { checkIns: [], error: error.message };
    }
    if (!dbCheckIns) {
        return { checkIns: [] };
    }

    const formattedCheckIns: FormattedCheckIn[] = dbCheckIns.map((ci: any) => ({ // ci is CheckIn joined with members part
      memberTableId: ci.member_table_id,
      memberName: ci.members?.name || 'Unknown Member',
      memberId: ci.members?.member_id || 'N/A',
      checkInTime: new Date(ci.check_in_time),
      gymName: gymName, // Use the provided gymName
    }));
    
    return { checkIns: formattedCheckIns };

  } catch (e: any) {
    console.error('Unexpected error fetching today\'s check-ins:', e.message);
    return { checkIns: [], error: 'Failed to fetch today\'s check-ins.' };
  }
}
