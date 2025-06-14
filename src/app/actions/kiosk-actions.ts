
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Member, FormattedCheckIn, CheckIn, MembershipType } from '@/lib/types';
import { sendEmail } from '@/lib/email-service';
import { formatDateIST, parseValidISO } from '@/lib/date-utils'; // Updated import
import { generateMotivationalQuote, type MotivationalQuoteInput } from '@/ai/flows/generate-motivational-quote';
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

export async function recordCheckInAction(memberTableUuid: string, gymDatabaseId: string): Promise<{ success: boolean; checkInTime?: string; error?: string }> {
  if (!memberTableUuid || !gymDatabaseId) {
    return { success: false, error: "Member UUID and Gym ID are required to record check-in." };
  }
  const supabase = createSupabaseServerActionClient();
  const checkInTime = new Date().toISOString();
  try {
    // Check for existing check-in today without check-out
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
        .is('check_out_time', null) // Only count if not checked out
        .maybeSingle();
    
    if(existingError){
        console.error("Error checking for existing check-in:", existingError.message);
        // Decide if this is a hard stop or not, for now we proceed
    }

    if(existingCheckin){
        return { success: false, error: "Member is already checked in today and not checked out."};
    }


    const { error } = await supabase
      .from('check_ins')
      .insert({
        member_table_id: memberTableUuid,
        gym_id: gymDatabaseId,
        check_in_time: checkInTime,
        created_at: new Date().toISOString(),
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

    let quote = "Keep pushing your limits! Every rep counts."; // Default quote
    try {
      const quoteInput: MotivationalQuoteInput = { memberId: member.memberId, memberName: member.name };
      const motivation = await generateMotivationalQuote(quoteInput);
      if (motivation.quote) {
        quote = motivation.quote;
      }
    } catch (aiError) {
      console.error("Failed to generate motivational quote for check-in email:", aiError);
    }

    const emailSubject = `Check-in Confirmed at ${gymName}!`;
    const emailHtmlBody = `
      <p>Hi ${member.name},</p>
      <p>Your check-in at ${gymName} is confirmed!</p>
      <ul>
        <li><strong>Checked-in At:</strong> ${formatDateIST(checkInTimeDate)}</li>
        <li><strong>Projected Check-out:</strong> ${formatDateIST(projectedCheckoutTime)}</li>
      </ul>
      <p>Your motivational boost for today:</p>
      <p><em>"${quote}"</em></p>
      <p>Have a great workout!</p>
      <p>The ${gymName} Team</p>
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
  const today = new Date();
  const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999)).toISOString();

  try {
    const { data: dbCheckIns, error } = await supabase
      .from('check_ins')
      .select(\`
        id,
        member_table_id,
        check_in_time,
        members (
          name,
          member_id 
        )
      \`)
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

    const formattedCheckIns: FormattedCheckIn[] = dbCheckIns.map((ci: any) => ({ 
      memberTableId: ci.member_table_id,
      memberName: ci.members?.name || 'Unknown Member',
      memberId: ci.members?.member_id || 'N/A',
      checkInTime: new Date(ci.check_in_time),
      gymName: gymName, 
    }));
    
    return { checkIns: formattedCheckIns };

  } catch (e: any) {
    console.error('Unexpected error fetching today\'s check-ins:', e.message);
    return { checkIns: [], error: 'Failed to fetch today\'s check-ins.' };
  }
}
