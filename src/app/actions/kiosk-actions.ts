
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Member, FormattedCheckIn, CheckIn, MembershipType, MembershipStatus, EffectiveMembershipStatus } from '@/lib/types';
import { differenceInDays, isValid, parseISO, addHours, startOfToday, endOfToday } from 'date-fns';


function getEffectiveStatusForCheckin(member: Member): EffectiveMembershipStatus {
  if (member.membershipStatus === 'expired') {
    return 'expired';
  }
  if (member.membershipStatus === 'active' && member.expiryDate) {
    const expiry = parseISO(member.expiryDate);
    if (isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 14) return 'expiring soon';
      return 'active';
    }
  }
  return member.membershipStatus === 'active' ? 'active' : 'expired'; // Fallback
}

function mapDbMemberToAppMember(dbMember: any): Member { 
  const planDetails = dbMember.plans; // This may be null if we don't join
  return {
    id: dbMember.id,
    gymId: dbMember.gym_id,
    planId: dbMember.plan_id,
    memberId: dbMember.member_id,
    name: dbMember.name,
    email: dbMember.email,
    membershipStatus: dbMember.membership_status as MembershipStatus, // 'active' or 'expired' from DB
    createdAt: dbMember.created_at,
    age: dbMember.age,
    phoneNumber: dbMember.phone_number,
    joinDate: dbMember.join_date,
    expiryDate: dbMember.expiry_date,
    membershipType: dbMember.membership_type as MembershipType || 'Other',
    planPrice: planDetails?.price || 0,
  };
}


export async function findMemberForCheckInAction(identifier: string, gymDatabaseId: string): Promise<{ member?: Member; error?: string }> {
  if (!identifier || !gymDatabaseId) {
    return { error: "Member identifier and Gym ID are required." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    // Optimized: Removed the join on `plans` table to speed up the query.
    // The necessary `membership_type` is already on the members table.
    const { data: dbMember, error } = await supabase
      .from('members')
      .select('*') 
      .eq('member_id', identifier)
      .eq('gym_id', gymDatabaseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { error: "Member not found at this gym."} 
      return { error: error.message };
    }
    if (!dbMember) {
        return { error: "Member not found at this gym." };
    }
    
    const member = mapDbMemberToAppMember(dbMember);
    const effectiveStatus = getEffectiveStatusForCheckin(member);

    if (effectiveStatus === 'expired') {
      return { error: `Membership for ${member.name} is expired. Please see reception.` };
    }
    // 'active' and 'expiring soon' are allowed to proceed to check-in recording
    
    return { member };

  } catch (e: any) {
    return { error: 'An unexpected error occurred while finding the member.' };
  }
}

export async function recordCheckInAction(memberTableUuid: string, gymDatabaseId: string): Promise<{ success: boolean; checkInTime?: string; checkOutTime?: string; checkInRecordId?: string; error?: string }> {
  if (!memberTableUuid || !gymDatabaseId) {
    return { success: false, error: "Member UUID and Gym ID are required to record check-in." };
  }
  const supabase = createSupabaseServerActionClient();
  
  try {
    // 1. Fetch gym session settings
    const { data: gymData, error: gymError } = await supabase
      .from('gyms')
      .select('session_time_hours')
      .eq('id', gymDatabaseId)
      .single();

    if (gymError || !gymData) {
      return { success: false, error: "Could not retrieve gym session settings to record check-in." };
    }
    
    // 2. Check for an existing ACTIVE check-in to prevent duplicates
    const now = new Date();
    const { count: activeCheckinCount, error: activeCheckError } = await supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('member_table_id', memberTableUuid)
      .eq('gym_id', gymDatabaseId)
      .gt('check_out_time', now.toISOString()); // Check if there's a session that hasn't ended yet

    if (activeCheckError) {
      return { success: false, error: `Database error checking for active session: ${activeCheckError.message}` };
    }

    if (activeCheckinCount && activeCheckinCount > 0) {
      return { success: false, error: "Member already has an active check-in session." };
    }
    
    // 3. Insert new check-in record
    const sessionHours = gymData.session_time_hours || 2; // Default to 2 hours if not set
    const checkInTime = new Date();
    const checkOutTime = addHours(checkInTime, sessionHours);
    
    const { data: newCheckInData, error } = await supabase
      .from('check_ins')
      .insert({
        member_table_id: memberTableUuid,
        gym_id: gymDatabaseId,
        check_in_time: checkInTime.toISOString(),
        check_out_time: checkOutTime.toISOString(), // Set the calculated check-out time
        created_at: new Date().toISOString(),
      })
      .select('id') 
      .single();

    if (error || !newCheckInData) {
      return { success: false, error: error?.message || "Failed to insert check-in record." };
    }
    return { success: true, checkInTime: checkInTime.toISOString(), checkOutTime: checkOutTime.toISOString(), checkInRecordId: newCheckInData.id };

  } catch (e: any) {
    return { success: false, error: 'An unexpected error occurred while recording the check-in.' };
  }
}


// Define a more specific type for the check-in payload with nested member details
type DbCheckInWithMember = CheckIn & {
  members: {
    name: string | null;
    member_id: string | null;
  } | null;
};

export async function fetchAllCheckInsForKioskAction(gymDatabaseId: string, gymName: string): Promise<{ checkIns: FormattedCheckIn[]; error?: string }> {
  if (!gymDatabaseId) return { checkIns: [], error: "Gym ID is required." };

  const supabase = createSupabaseServerActionClient();
  
  try {
    const { data: dbCheckIns, error } = await supabase
      .from('check_ins')
      .select('id, member_table_id, check_in_time, check_out_time, created_at, members(name, member_id)')
      .eq('gym_id', gymDatabaseId)
      .order('check_in_time', { ascending: false })
      .limit(100);

    if (error) {
      return { checkIns: [], error: error.message };
    }
    if (!dbCheckIns) {
        return { checkIns: [] };
    }
    
    // Cast the returned data to our more specific type
    const typedCheckins = dbCheckIns as DbCheckInWithMember[];

    const formattedCheckIns: FormattedCheckIn[] = typedCheckins.map((ci) => ({ 
      checkInRecordId: ci.id,
      memberTableId: ci.member_table_id,
      memberName: ci.members?.name || 'Unknown Member',
      memberId: ci.members?.member_id || 'N/A',
      checkInTime: new Date(ci.check_in_time),
      checkOutTime: ci.check_out_time ? new Date(ci.check_out_time) : null,
      createdAt: new Date(ci.created_at),
      gymName: gymName, 
    }));
    
    return { checkIns: formattedCheckIns };

  } catch (e: any) {
    return { checkIns: [], error: 'Failed to fetch check-ins.' };
  }
}
