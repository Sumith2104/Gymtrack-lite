
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Member, FormattedCheckIn, CheckIn, MembershipType, MembershipStatus } from '@/lib/types';
import { sendEmail } from '@/lib/email-service';
import { formatDateIST, parseValidISO } from '@/lib/date-utils'; 
// Removed: import { generateMotivationalQuote, type MotivationalQuoteInput } from '@/ai/flows/generate-motivational-quote';
import { addHours } from 'date-fns';

function mapDbMemberToAppMember(dbMember: any): Member { 
  const planDetails = dbMember.plans; 
  return {
    id: dbMember.id,
    gymId: dbMember.gym_id,
    planId: dbMember.plan_id,
    memberId: dbMember.member_id,
    name: dbMember.name,
    email: dbMember.email,
    membershipStatus: dbMember.membership_status as MembershipStatus,
    createdAt: dbMember.created_at,
    age: dbMember.age,
    phoneNumber: dbMember.phone_number,
    joinDate: dbMember.join_date,
    expiryDate: dbMember.expiry_date,
    membershipType: planDetails?.plan_name as MembershipType || 'Other',
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
      .select('*, plans(plan_name, price, duration_months)') 
      .eq('member_id', identifier)
      .eq('gym_id', gymDatabaseId)
      .single();

    if (error) {
      console.error('Error finding member for check-in:', error.message);
      if (error.code === 'PGRST116') return { error: "Member not found at this gym."} 
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

export async function recordCheckInAction(memberTableUuid: string, gymDatabaseId: string): Promise<{ success: boolean; checkInTime?: string; checkInRecordId?: string; error?: string }> {
  if (!memberTableUuid || !gymDatabaseId) {
    return { success: false, error: "Member UUID and Gym ID are required to record check-in." };
  }
  const supabase = createSupabaseServerActionClient();
  const checkInTime = new Date().toISOString();
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23,59,59,999);

    const { data: existingCheckin, error: existingError } = await supabase
        .from('check_ins')
        .select('id')
        .eq('member_table_id', memberTableUuid)
        .eq('gym_id', gymDatabaseId)
        .gte('check_in_time', todayStart.toISOString())
        .lte('check_in_time', todayEnd.toISOString())
        .is('check_out_time', null) 
        .maybeSingle();
    
    if(existingError){
        console.error("Error checking for existing check-in:", existingError.message);
    }

    if(existingCheckin){
        return { success: false, error: "Member is already checked in today and not checked out."};
    }

    const { data: newCheckInData, error } = await supabase
      .from('check_ins')
      .insert({
        member_table_id: memberTableUuid,
        gym_id: gymDatabaseId,
        check_in_time: checkInTime,
        created_at: new Date().toISOString(),
      })
      .select('id') // Select the ID of the newly inserted row
      .single();

    if (error || !newCheckInData) {
      console.error('Error recording check-in:', error?.message);
      return { success: false, error: error?.message || "Failed to insert check-in record." };
    }
    return { success: true, checkInTime, checkInRecordId: newCheckInData.id };

  } catch (e: any) {
    console.error('Unexpected error in recordCheckInAction:', e.message);
    return { success: false, error: 'An unexpected error occurred while recording the check-in.' };
  }
}


export async function sendCheckInEmailAction(
  member: Member, 
  checkInTimeISO: string, 
  gymName: string
): Promise<{ success: boolean; message: string }> {
  if (!member.email) {
    return { success: true, message: "No email address for member. Skipped check-in email." };
  }

  try {
    const checkInTimeDate = parseValidISO(checkInTimeISO); 
    if (!checkInTimeDate) {
      return { success: false, message: "Invalid check-in time provided for email." };
    }
    const projectedCheckoutTime = addHours(checkInTimeDate, 2);

    // AI Quote generation removed. Use a default static quote.
    const quote = "Sweat now, shine later. Make every rep count!"; 

    const emailSubject = `Check-in Confirmed at ${gymName}!`;
    const formattedCheckInTime = `${formatDateIST(checkInTimeDate, 'p')} (IST)`;
    const formattedProjectedCheckoutTime = `${formatDateIST(projectedCheckoutTime, 'p')} (IST)`;
    
    const emailHtmlBody = `
      <p style="font-size: 1.1em; color: #FFD700; font-weight: bold;">Hi ${member.name},</p>
      <p>You've successfully checked in at ${gymName}!</p>
      <p><strong>Check-in Time:</strong> ${formattedCheckInTime}</p>
      <p><strong>Projected Check-out Time:</strong> ${formattedProjectedCheckoutTime}</p>
      <p>Enjoy your workout!</p>
      <hr style="border: none; border-top: 1px solid #444; margin: 20px 0;">
      <p style="font-style: italic;">"${quote}"</p>
      <br>
      <p>Best regards,<br/>The ${gymName} Team</p>
    `;

    return await sendEmail({
      to: member.email,
      subject: emailSubject,
      htmlBody: emailHtmlBody,
    });

  } catch (error: any) {
    console.error("Error in sendCheckInEmailAction:", error);
    return { success: false, message: `Failed to process check-in email: ${error.message}` };
  }
}


export async function fetchTodaysCheckInsForKioskAction(gymDatabaseId: string, gymName: string): Promise<{ checkIns: FormattedCheckIn[]; error?: string }> {
  if (!gymDatabaseId) return { checkIns: [], error: "Gym ID is required." };

  const supabase = createSupabaseServerActionClient();
  // Removed date filtering to fetch all check-ins
  // const today = new Date();
  // const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0)).toISOString();
  // const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999)).toISOString();

  try {
    const { data: dbCheckIns, error } = await supabase
      .from('check_ins')
      .select('id, member_table_id, check_in_time, check_out_time, created_at, members(name, member_id)')
      .eq('gym_id', gymDatabaseId)
      // .gte('check_in_time', startOfDay) // Removed start of day filter
      // .lte('check_in_time', endOfDay)   // Removed end of day filter
      .order('check_in_time', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins:', error.message);
      return { checkIns: [], error: error.message };
    }
    if (!dbCheckIns) {
        return { checkIns: [] };
    }

    const formattedCheckIns: FormattedCheckIn[] = dbCheckIns.map((ci: any) => ({ 
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
    console.error('Unexpected error fetching check-ins:', e.message);
    return { checkIns: [], error: 'Failed to fetch check-ins.' };
  }
}

