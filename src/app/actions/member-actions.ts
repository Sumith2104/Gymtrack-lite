
'use server';

import { addMonths, differenceInDays, isValid, parseISO, format, subMonths, startOfMonth, eachMonthOfInterval, endOfMonth } from 'date-fns';
import type { Member, MembershipStatus, EffectiveMembershipStatus, AttendanceSummary, MonthlyCheckin } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { addAnnouncementAction } from './announcement-actions';
import { sendEmail } from '@/lib/email-service';
import { formatDateIST, parseValidISO } from '@/lib/date-utils';

// Helper function to determine effective status
function getEffectiveMembershipStatus(member: Pick<Member, 'membershipStatus' | 'expiryDate'>): EffectiveMembershipStatus {
  if (member.membershipStatus === 'expired') {
    return 'expired';
  }

  if (member.membershipStatus === 'active' && member.expiryDate) {
    const expiry = parseValidISO(member.expiryDate);
    if (expiry && isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 14) return 'expiring soon';
      return 'active';
    }
  }
  
  // Fallback for 'active' status without a valid date.
  return 'active';
}


interface AddMemberServerResponse {
  data?: {
    newMember: Member;
    emailStatus: string;
  };
  error?: string;
}

function mapDbMemberToAppMember(dbMember: any): Member {
  const planDetails = dbMember.plans;
  const typeFromDbMember = dbMember.membership_type as string | undefined;

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
    membershipType: typeFromDbMember || planDetails?.plan_name || 'N/A',
    planPrice: planDetails?.price ?? 0,
    profileUrl: dbMember.profile_url,
  };
}


export async function addMember(
  formData: AddMemberFormValues,
  gymDatabaseId: string,
  formattedGymId: string,
  gymName: string
): Promise<AddMemberServerResponse> {
  const supabase = createSupabaseServerActionClient();
  try {
    const validationResult = addMemberFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      let errorMessages = Object.entries(fieldErrors)
        .map(([key, messages]) => `${key}: ${(messages as string[]).join(', ')}`)
        .join('; ');
      return { error: `Validation failed: ${errorMessages || 'Check inputs.'}` };
    }

    const { name, email, phoneNumber, age, selectedPlanUuid } = validationResult.data;

    const { data: planDetails, error: planError } = await supabase
      .from('plans')
      .select('plan_name, price, duration_months')
      .eq('id', selectedPlanUuid)
      .eq('gym_id', gymDatabaseId)
      .eq('is_active', true)
      .single();

    if (planError || !planDetails) {
      return { error: `Invalid or inactive membership plan. Details: ${planError?.message || 'Plan not found for this gym.'}` };
    }
    if (planDetails.duration_months === null || planDetails.duration_months === undefined) {
        return { error: `Selected plan '${planDetails.plan_name}' has an invalid duration.`};
    }

    const joinDate = new Date();
    const expiryDate = addMonths(joinDate, planDetails.duration_months);

    // New Member ID Generation Logic
    const currentYearDigits = new Date().getFullYear().toString().slice(-2);
    
    const gymNameForId = gymName || "GYM"; // Fallback for gymName
    const gymInitials = gymNameForId.split(' ')
                                  .filter(word => word.length > 0)
                                  .map(word => word[0])
                                  .join('')
                                  .toUpperCase();
    const finalGymInitials = gymInitials.length > 0 ? gymInitials : "XX";

    const memberNameForId = name || "USER"; // Fallback for name
    const memberNamePrefix = memberNameForId.substring(0, 4).toUpperCase();
    
    const phoneNumberForId = phoneNumber || "0000"; // Fallback for phoneNumber
    const phoneSuffix = phoneNumberForId.replace(/\D/g, '').slice(-4);
    
    const planNameForId = planDetails?.plan_name || "PLAN"; // Fallback for plan_name
    const planInitial = planNameForId.substring(0, 1).toUpperCase();

    const memberId = `${currentYearDigits}${finalGymInitials}${memberNamePrefix}${phoneSuffix}${planInitial}`;
    // End New Member ID Generation Logic


    const newMemberForDb = {
      gym_id: gymDatabaseId,
      plan_id: selectedPlanUuid,
      member_id: memberId, // Use the new memberId
      name,
      email,
      phone_number: phoneNumber,
      age,
      membership_status: 'active' as MembershipStatus,
      membership_type: planDetails.plan_name,
      join_date: joinDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data: insertedMemberData, error: insertError } = await supabase
      .from('members')
      .insert(newMemberForDb)
      .select('*, plans (plan_name, price, duration_months)')
      .single();

    if (insertError || !insertedMemberData) {
      return { error: `Failed to add member to database: ${insertError?.message || "Unknown DB error."}`};
    }

    const newMemberAppFormat = mapDbMemberToAppMember(insertedMemberData);

    let emailStatus = 'Email not sent (member has no email or SMTP not configured).';
    if (newMemberAppFormat.email) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(newMemberAppFormat.memberId)}`;
      const emailSubject = `Welcome to ${gymName}, ${newMemberAppFormat.name}!`;

      const emailHtmlBody = `
        <p>Dear ${newMemberAppFormat.name},</p>
        <p>We're thrilled to have you as a new member of ${gymName}.</p>
        <p>Here are your membership details:</p>
        <ul style="list-style-type: none; padding-left: 0;">
          <li><strong style="color: #FFD700; font-weight: bold;">Member ID:</strong> ${newMemberAppFormat.memberId}</li>
          <li><strong style="color: #FFD700; font-weight: bold;">Name:</strong> ${newMemberAppFormat.name}</li>
          <li><strong style="color: #FFD700; font-weight: bold;">Join Date:</strong> ${newMemberAppFormat.joinDate ? formatDateIST(newMemberAppFormat.joinDate, 'PP') : 'N/A'}</li>
          <li><strong style="color: #FFD700; font-weight: bold;">Membership Type:</strong> ${newMemberAppFormat.membershipType || 'N/A'}</li>
          <li><strong style="color: #FFD700; font-weight: bold;">Plan Price:</strong> ₹${newMemberAppFormat.planPrice?.toFixed(2) || '0.00'}</li>
          <li><strong style="color: #FFD700; font-weight: bold;">Membership Expires:</strong> ${newMemberAppFormat.expiryDate ? formatDateIST(newMemberAppFormat.expiryDate, 'PP') : 'N/A'}</li>
        </ul>
        <p>You can use the QR code below for quick check-ins:</p>
        <div class="qr-code" style="text-align: center; margin: 20px 0;">
          <img src="${qrCodeUrl}" alt="Membership QR Code" style="max-width: 150px; border: 3px solid #FFD700; border-radius: 4px;" />
        </div>
        <p>If you have any questions, feel free to contact us.</p>
        <p>Best regards,<br/>The ${gymName} Team</p>
      `;

      const emailResult = await sendEmail({
        to: newMemberAppFormat.email,
        subject: emailSubject,
        htmlBody: emailHtmlBody,
        gymDatabaseId: gymDatabaseId,
      });
      emailStatus = emailResult.message;
    }


    const announcementTitle = `Welcome New Member: ${newMemberAppFormat.name}!`;
    const announcementContent = `Let's all give a warm welcome to ${newMemberAppFormat.name} (ID: ${newMemberAppFormat.memberId}), who joined us on ${newMemberAppFormat.joinDate ? formatDateIST(newMemberAppFormat.joinDate, 'PPP') : 'a recent date'} with a ${newMemberAppFormat.membershipType || 'new'} membership! We're excited to have them in the ${gymName} community.`;


    // Call addAnnouncementAction with broadcastEmail set to false
    const announcementResult = await addAnnouncementAction(formattedGymId, announcementTitle, announcementContent, false);
    if (announcementResult.error) {
      console.warn(`Failed to create welcome announcement for ${newMemberAppFormat.name}: ${announcementResult.error}`);
    } else if (announcementResult.newAnnouncement?.id) {
        // Successfully created dashboard-only announcement
    }

    return { data: { newMember: newMemberAppFormat, emailStatus } };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `Error in addMember: ${errorMessage}` };
  }
}

interface EditMemberServerResponse {
  data?: { updatedMember: Member; message: string; };
  error?: string;
}

export async function editMember(
  formData: AddMemberFormValues,
  memberOriginalDbId: string,
  gymDatabaseId: string
): Promise<EditMemberServerResponse> {
  const supabase = createSupabaseServerActionClient();
  try {
    const validationResult = addMemberFormSchema.safeParse(formData);
    if (!validationResult.success) {
      return { error: `Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}` };
    }
    const { name, email, phoneNumber, age, selectedPlanUuid } = validationResult.data;

    const { data: existingMember, error: fetchError } = await supabase
      .from('members')
      .select('join_date, member_id, membership_status')
      .eq('id', memberOriginalDbId)
      .eq('gym_id', gymDatabaseId)
      .single();

    if (fetchError || !existingMember) {
        return { error: `Member with ID ${memberOriginalDbId} not found at this gym. ${fetchError?.message || ''}`};
    }

    const { data: planDetails, error: planError } = await supabase
      .from('plans')
      .select('plan_name, price, duration_months')
      .eq('id', selectedPlanUuid)
      .eq('gym_id', gymDatabaseId)
      .eq('is_active', true)
      .single();

    if (planError || !planDetails) {
      return { error: `Invalid or inactive new membership plan. Details: ${planError?.message || 'Plan not found for this gym.'}` };
    }
    if (planDetails.duration_months === null || planDetails.duration_months === undefined) {
        return { error: `Selected new plan '${planDetails.plan_name}' has an invalid duration.`};
    }

    const joinDateForCalc = existingMember.join_date ? parseValidISO(existingMember.join_date) : new Date();
    if (!joinDateForCalc) {
        return { error: "Could not parse existing member's join date."}
    }
    const expiryDate = addMonths(joinDateForCalc, planDetails.duration_months);

    const memberUpdateForDb = {
      name,
      email,
      phone_number: phoneNumber,
      age,
      plan_id: selectedPlanUuid,
      expiry_date: expiryDate.toISOString(),
      membership_status: 'active' as MembershipStatus,
      membership_type: planDetails.plan_name,
    };

    const { data: updatedMemberData, error: updateError } = await supabase
      .from('members')
      .update(memberUpdateForDb)
      .eq('id', memberOriginalDbId)
      .select('*, plans (plan_name, price, duration_months)')
      .single();

    if (updateError || !updatedMemberData) {
      return { error: `Failed to update member: ${updateError?.message || "Unknown DB error."}` };
    }

    const updatedMemberAppFormat = mapDbMemberToAppMember(updatedMemberData);
    return { data: { updatedMember: updatedMemberAppFormat, message: "Member details updated." } };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `Error in editMember: ${errorMessage}` };
  }
}


export async function fetchMembers(gymDatabaseId: string): Promise<{ data?: Member[]; error?: string }> {
  if (!gymDatabaseId) return { error: "Gym ID is required to fetch members." };
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: dbMembers, error } = await supabase
      .from('members')
      .select('*, profile_url, plans (plan_name, price, duration_months)')
      .eq('gym_id', gymDatabaseId)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }
    if (!dbMembers) {
        return { data: [] };
    }

    const members = dbMembers.map(mapDbMemberToAppMember);
    return { data: members };

  } catch (e: any) {
    return { error: 'Failed to fetch members due to an unexpected error.' };
  }
}

export async function deleteMemberAction(memberDbId: string): Promise<{ success: boolean; error?: string }> {
  if (!memberDbId) return { success: false, error: "Member ID is required for deletion." };
  const supabase = createSupabaseServerActionClient();
  try {
    const { error: checkinError } = await supabase.from('check_ins').delete().eq('member_table_id', memberDbId);
     if (checkinError) {
    }
    const { error } = await supabase.from('members').delete().eq('id', memberDbId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: 'Failed to delete member due to an unexpected error.' };
  }
}


export async function updateMemberStatusAction(memberDbId: string, newStatus: MembershipStatus): Promise<{ updatedMember?: Member; error?: string }> {
  if (!memberDbId || !newStatus) return { error: "Member ID and new status are required." };
  if (newStatus !== 'active' && newStatus !== 'expired') {
    return { error: "Invalid status. Can only set to 'active' or 'expired'." };
  }

  const supabase = createSupabaseServerActionClient();
  try {
    const updateData: { membership_status: MembershipStatus; expiry_date?: string } = { membership_status: newStatus };

    const { data: updatedDbMember, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', memberDbId)
      .select('*, profile_url, plans (plan_name, price, duration_months), gyms (name)')
      .single();

    if (error || !updatedDbMember) {
      return { error: error?.message || "Failed to update member status or member not found." };
    }
    
    const gymName = updatedDbMember.gyms?.name;
    const updatedMemberAppFormat = mapDbMemberToAppMember(updatedDbMember);
    
    // Send email notification
    if (updatedMemberAppFormat.email && gymName) {
      const emailSubject = `Your Membership Status at ${gymName} has been Updated`;
      
      let statusExplanation = '';
      switch(newStatus) {
        case 'active':
          statusExplanation = 'Your membership has been set to <strong>Active</strong>. You can continue to enjoy all the facilities.';
          break;
        case 'expired':
          statusExplanation = 'Your membership has been set to <strong>Expired</strong>. Please visit the reception to renew your plan and regain access.';
          break;
      }
      
      const emailHtmlBody = `
        <p>Dear ${updatedMemberAppFormat.name},</p>
        <p>This is a notification to inform you that your membership status at ${gymName} has been updated.</p>
        <p><strong>New Status:</strong> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>
        <div class="announcement-content" style="padding: 10px; border-left: 3px solid #FFD700; margin: 10px 0; background-color: #222;">
            <p>${statusExplanation}</p>
        </div>
        <p>If you have any questions, please contact us or visit the reception.</p>
        <p>Best regards,<br/>The ${gymName} Team</p>
      `;

      await sendEmail({
        to: updatedMemberAppFormat.email,
        subject: emailSubject,
        htmlBody: emailHtmlBody,
        gymDatabaseId: updatedMemberAppFormat.gymId,
      });
    }

    return { updatedMember: updatedMemberAppFormat };
  } catch (e: any) {
    return { error: 'Failed to update status due to an unexpected error.' };
  }
}

export async function deleteMembersAction(memberDbIds: string[]): Promise<{ successCount: number; errorCount: number; error?: string }> {
  if (!memberDbIds || memberDbIds.length === 0) {
    return { successCount: 0, errorCount: 0, error: "No member IDs provided for deletion." };
  }
  const supabase = createSupabaseServerActionClient();
  let SCount = 0;
  let ECount = 0;
  let lastError: string | undefined = undefined;

  for (const memberId of memberDbIds) {
    const { error: checkinError } = await supabase.from('check_ins').delete().eq('member_table_id', memberId);
    if (checkinError) {
    }

    const { error: memberDeleteError } = await supabase.from('members').delete().eq('id', memberId);
    if (memberDeleteError) {
      ECount++;
      lastError = memberDeleteError.message;
    } else {
      SCount++;
    }
  }

  return { successCount: SCount, errorCount: ECount, error: lastError };
}


export async function bulkUpdateMemberStatusAction(memberDbIds: string[], newStatus: MembershipStatus): Promise<{ successCount: number; errorCount: number; emailSentCount: number; error?: string }> {
  if (!memberDbIds || memberDbIds.length === 0) {
    return { successCount: 0, errorCount: 0, emailSentCount: 0, error: "No member IDs provided for status update." };
  }
  if (newStatus !== 'active' && newStatus !== 'expired') {
    return { successCount: 0, errorCount: memberDbIds.length, emailSentCount: 0, error: "Invalid status. Can only set to 'active' or 'expired'." };
  }
  
  const supabase = createSupabaseServerActionClient();
  
  // 1. Fetch members that will be updated to get their email and name
  const { data: membersToUpdate, error: fetchError } = await supabase
    .from('members')
    .select('id, name, email, gym_id, gyms (name)')
    .in('id', memberDbIds);

  if (fetchError) {
      return { successCount: 0, errorCount: memberDbIds.length, emailSentCount: 0, error: `Failed to fetch members for update: ${fetchError.message}` };
  }
  if (!membersToUpdate || membersToUpdate.length === 0) {
      return { successCount: 0, errorCount: memberDbIds.length, emailSentCount: 0, error: 'No matching members found to update.' };
  }

  // 2. Perform the update
  const { error: updateError, data: updatedData } = await supabase
    .from('members')
    .update({ membership_status: newStatus })
    .in('id', memberDbIds)
    .select('id');

  if (updateError) {
    return { successCount: 0, errorCount: memberDbIds.length, emailSentCount: 0, error: updateError.message };
  }

  const successCount = updatedData ? updatedData.length : 0;
  const errorCount = memberDbIds.length - successCount;
  
  // 3. Send emails to successfully updated members
  let emailSentCount = 0;
  if (successCount > 0) {
    const successfullyUpdatedIds = new Set(updatedData.map(m => m.id));

    let statusExplanation = '';
    switch(newStatus) {
        case 'active': statusExplanation = 'Your membership has been set to <strong>Active</strong>. You can continue to enjoy all the facilities.'; break;
        case 'expired': statusExplanation = 'Your membership has been set to <strong>Expired</strong>. Please visit the reception to renew your plan and regain access.'; break;
    }

    for (const member of membersToUpdate) {
      if (successfullyUpdatedIds.has(member.id) && member.email) {
        const gymName = member.gyms?.name;
        if (gymName) {
           const emailSubject = `Your Membership Status at ${gymName} has been Updated`;
           const emailHtmlBody = `
            <p>Dear ${member.name},</p>
            <p>This is a notification to inform you that your membership status at ${gymName} has been updated.</p>
            <p><strong>New Status:</strong> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>
            <div class="announcement-content" style="padding: 10px; border-left: 3px solid #FFD700; margin: 10px 0; background-color: #222;">
                <p>${statusExplanation}</p>
            </div>
            <p>If you have any questions, please contact us or visit the reception.</p>
            <p>Best regards,<br/>The ${gymName} Team</p>
          `;
          
          const emailResult = await sendEmail({
              to: member.email,
              subject: emailSubject,
              htmlBody: emailHtmlBody,
              gymDatabaseId: member.gym_id,
          });

          if (emailResult.success) {
              emailSentCount++;
          }
        }
      }
    }
  }

  return { successCount, errorCount, emailSentCount, error: errorCount > 0 ? "Some members could not be updated." : undefined };
}


export async function sendBulkCustomEmailAction(
  memberDbIds: string[],
  subject: string,
  body: string,
  gymName: string,
  includeQrCode: boolean,
  gymDatabaseId: string
): Promise<{ attempted: number; successful: number; noEmailAddress: number; failed: number; error?: string }> {
  if (!memberDbIds || memberDbIds.length === 0) {
    return { attempted: 0, successful: 0, noEmailAddress: 0, failed: 0, error: "No member IDs provided for email." };
  }
  if (!subject || !body) {
    return { attempted: 0, successful: 0, noEmailAddress: 0, failed: 0, error: "Subject and body are required for email." };
  }

  const supabase = createSupabaseServerActionClient();
  let attempted = 0;
  let successful = 0;
  let noEmailAddress = 0;
  let failed = 0;

  try {
    const { data: members, error: fetchError } = await supabase
      .from('members')
      .select('id, name, email, member_id, membership_status, expiry_date')
      .in('id', memberDbIds);

    if (fetchError) {
      return { attempted, successful, noEmailAddress, failed, error: `Failed to fetch member details: ${fetchError.message}` };
    }

    if (!members || members.length === 0) {
      return { attempted, successful, noEmailAddress, failed, error: "No matching members found for the provided IDs." };
    }

    for (const member of members) {
      const effectiveStatus = getEffectiveMembershipStatus({
        membershipStatus: member.membership_status as MembershipStatus,
        expiryDate: member.expiry_date,
      });

      if (member.email && (effectiveStatus === 'active' || effectiveStatus === 'expiring soon')) {
        attempted++;
        let emailHtmlBody = `<p>Dear ${member.name || 'Member'},</p><p>${body.replace(/\n/g, '<br />')}</p>`;

        if (memberDbIds.length === 1 && includeQrCode && member.member_id) {
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(member.member_id)}`;
          emailHtmlBody += `
            <p>Your Member ID QR Code:</p>
            <div class="qr-code" style="text-align: center; margin: 20px 0;">
              <img src="${qrCodeUrl}" alt="Membership QR Code" style="max-width: 150px; border: 3px solid #FFD700; border-radius: 4px;" />
            </div>
          `;
        }

        emailHtmlBody += `<p>Regards,<br/>The ${gymName} Team</p>`;

        const emailResult = await sendEmail({
          to: member.email,
          subject: subject,
          htmlBody: emailHtmlBody,
          gymDatabaseId: gymDatabaseId,
        });

        if (emailResult.success) {
          successful++;
        } else {
          failed++;
        }
      } else if (!member.email && (effectiveStatus === 'active' || effectiveStatus === 'expiring soon')) {
        noEmailAddress++;
      }
    }
    return { attempted, successful, noEmailAddress, failed };

  } catch (e: any) {
    return { attempted, successful, noEmailAddress, failed, error: 'An unexpected error occurred while sending emails.' };
  }
}

export async function getMemberAttendanceSummary(memberDbId: string): Promise<{ data?: AttendanceSummary; error?: string }> {
  if (!memberDbId) {
    return { error: 'Member ID is required.' };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: checkIns, error } = await supabase
      .from('check_ins')
      .select('check_in_time')
      .eq('member_table_id', memberDbId)
      .order('check_in_time', { ascending: false });

    if (error) {
      throw error;
    }

    if (!checkIns || checkIns.length === 0) {
      return {
        data: {
          totalCheckIns: 0,
          lastCheckInTime: null,
          recentCheckIns: [],
        },
      };
    }
    
    const recentCheckInDates = checkIns.slice(0, 5).map(ci => parseISO(ci.check_in_time));
    
    const summary: AttendanceSummary = {
      totalCheckIns: checkIns.length,
      lastCheckInTime: checkIns[0] ? parseISO(checkIns[0].check_in_time) : null,
      recentCheckIns: recentCheckInDates,
    };

    return { data: summary };

  } catch (e: any) {
    return { error: `Failed to fetch attendance summary: ${e.message}` };
  }
}

export async function getMemberById(memberDbId: string): Promise<{ data?: Member; error?: string }> {
  if (!memberDbId) {
    return { error: "Member Database ID is required." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: dbMember, error } = await supabase
      .from('members')
      .select('*, profile_url, plans (plan_name, price, duration_months)')
      .eq('id', memberDbId)
      .single();

    if (error) {
      return { error: `Database error: ${error.message}` };
    }
    if (!dbMember) {
      return { error: "Member not found." };
    }
    const member = mapDbMemberToAppMember(dbMember);
    return { data: member };

  } catch (e: any) {
    return { error: `An unexpected error occurred: ${e.message}` };
  }
}

export async function getMemberCheckinHistory(memberDbId: string): Promise<{ data?: MonthlyCheckin[]; error?: string }> {
  if (!memberDbId) {
    return { error: 'Member ID is required.' };
  }
  const supabase = createSupabaseServerActionClient();

  const today = new Date();
  const twelveMonthsAgo = subMonths(today, 11);
  const startOfInterval = startOfMonth(twelveMonthsAgo);

  try {
    const { data: checkIns, error } = await supabase
      .from('check_ins')
      .select('check_in_time')
      .eq('member_table_id', memberDbId)
      .gte('check_in_time', startOfInterval.toISOString());
    
    if (error) {
      throw error;
    }

    const monthsInterval = eachMonthOfInterval({
      start: startOfInterval,
      end: today,
    });

    const monthlyData = monthsInterval.map(monthDate => ({
      month: format(monthDate, 'MMM'),
      count: 0,
    }));
    
    const monthlyMap = new Map<string, number>();
    monthlyData.forEach(m => monthlyMap.set(m.month, 0));

    if (checkIns) {
      for (const checkIn of checkIns) {
        const monthName = format(parseISO(checkIn.check_in_time), 'MMM');
        if (monthlyMap.has(monthName)) {
          monthlyMap.set(monthName, (monthlyMap.get(monthName) || 0) + 1);
        }
      }
    }

    const finalData = monthlyData.map(m => ({
        ...m,
        count: monthlyMap.get(m.month) || 0,
    }));
    
    return { data: finalData };
  } catch (e: any) {
    return { error: `Failed to fetch check-in history: ${e.message}` };
  }
}
