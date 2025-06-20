
'use server';

import { addMonths } from 'date-fns';
import type { Member, MembershipStatus, EffectiveMembershipStatus } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { addAnnouncementAction } from './announcement-actions'; 
import { sendEmail } from '@/lib/email-service';
import { formatDateIST, parseValidISO } from '@/lib/date-utils'; 

interface AddMemberServerResponse {
  data?: {
    newMember: Member;
    emailStatus: string;
  };
  error?: string;
}

function mapDbMemberToAppMember(dbMember: any): Member {
  const planDetails = dbMember.plans;
  return {
    id: dbMember.id,
    gymId: dbMember.gym_id,
    planId: dbMember.plan_id,
    memberId: dbMember.member_id,
    name: dbMember.name,
    email: dbMember.email,
    membershipStatus: dbMember.membership_status as MembershipStatus, // DB stores 'active' or 'expired'
    createdAt: dbMember.created_at,
    age: dbMember.age,
    phoneNumber: dbMember.phone_number,
    joinDate: dbMember.join_date,
    expiryDate: dbMember.expiry_date,
    membershipType: planDetails?.plan_name || 'N/A', 
    planPrice: planDetails?.price ?? 0,
  };
}


export async function addMember(
  formData: AddMemberFormValues,
  gymDatabaseId: string,
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
      .eq('is_active', true)
      .single();

    if (planError || !planDetails) {
      return { error: `Invalid or inactive membership plan. Details: ${planError?.message || 'Plan not found.'}` };
    }
    if (planDetails.duration_months === null || planDetails.duration_months === undefined) {
        return { error: `Selected plan '${planDetails.plan_name}' has an invalid duration.`};
    }

    const joinDate = new Date();
    const expiryDate = addMonths(joinDate, planDetails.duration_months);
    
    const memberIdSuffix = Date.now().toString().slice(-4) + Math.random().toString(36).substring(2, 4).toUpperCase();
    const memberId = `${gymName.substring(0, 3).toUpperCase()}${name.substring(0,1).toUpperCase()}${memberIdSuffix}`.replace(/[^A-Z0-9]/g, '').substring(0, 10);


    const newMemberForDb = {
      gym_id: gymDatabaseId,
      plan_id: selectedPlanUuid,
      member_id: memberId,
      name,
      email,
      phone_number: phoneNumber,
      age,
      membership_status: 'active' as MembershipStatus, // New members are active
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
      });
      emailStatus = emailResult.message;
    }

    const announcementTitle = `Welcome New Member: ${newMemberAppFormat.name}!`;
    const announcementContent = `Let's all give a warm welcome to ${newMemberAppFormat.name} (ID: ${newMemberAppFormat.memberId}), who joined us on ${newMemberAppFormat.joinDate ? formatDateIST(newMemberAppFormat.joinDate, 'PPP') : 'a recent date'} with a ${newMemberAppFormat.membershipType || 'new'} membership! We're excited to have them in the ${gymName} community.`;
    
    const announcementResult = await addAnnouncementAction(gymDatabaseId, announcementTitle, announcementContent);
    if (announcementResult.error) {
      // Do not return error here, member addition was successful
    } else if (announcementResult.newAnnouncement?.id) {
       // Welcome announcement created
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
      .select('join_date, member_id, membership_status') // Keep existing status unless explicitly changed by another action
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
      .eq('is_active', true)
      .single();

    if (planError || !planDetails) {
      return { error: `Invalid or inactive new membership plan. Details: ${planError?.message || 'Plan not found.'}` };
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
      // membership_status is NOT updated here. It's updated by updateMemberStatusAction.
      // If plan change implies reactivation, status should be 'active'.
      // We assume if a plan is being edited/changed, the member should be 'active' with the new expiry.
      membership_status: 'active' as MembershipStatus,
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
      .select('*, plans (plan_name, price, duration_months)') 
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
      // Could not delete related check-ins, but proceeding with member deletion
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

// newStatus here refers to the DB status: 'active' or 'expired'
export async function updateMemberStatusAction(memberDbId: string, newStatus: MembershipStatus): Promise<{ updatedMember?: Member; error?: string }> {
  if (!memberDbId || !newStatus) return { error: "Member ID and new status are required." };
  if (newStatus !== 'active' && newStatus !== 'expired') {
    return { error: "Invalid status. Can only set to 'active' or 'expired'." };
  }

  const supabase = createSupabaseServerActionClient();
  try {
    const updateData: { membership_status: MembershipStatus; expiry_date?: string } = { membership_status: newStatus };
    
    // If setting to 'active' and member was 'expired', we might need to update expiry_date based on their current plan
    // For simplicity now, we only update status. A full reactivation might involve re-assigning a plan.
    // If setting to 'expired', ensure expiry_date is in the past or null.
    if (newStatus === 'expired') {
        // To ensure consistency, we can set expiry_date to a past date if it's not already.
        // However, this might conflict with plan details. For now, just update status.
        // A better approach for "Mark as Expired" might be to adjust expiry_date through editMember if needed.
    }


    const { data: updatedDbMember, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', memberDbId)
      .select('*, plans (plan_name, price, duration_months)') 
      .single();

    if (error || !updatedDbMember) {
      return { error: error?.message || "Failed to update member status or member not found." };
    }
    const updatedMemberAppFormat = mapDbMemberToAppMember(updatedDbMember);
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
      // Could not delete check-ins for member, Proceeding with member deletion.
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

// newStatus here refers to the DB status: 'active' or 'expired'
export async function bulkUpdateMemberStatusAction(memberDbIds: string[], newStatus: MembershipStatus): Promise<{ successCount: number; errorCount: number; error?: string }> {
  if (!memberDbIds || memberDbIds.length === 0) {
    return { successCount: 0, errorCount: 0, error: "No member IDs provided for status update." };
  }
  if (newStatus !== 'active' && newStatus !== 'expired') {
    return { successCount: 0, errorCount: memberDbIds.length, error: "Invalid status. Can only set to 'active' or 'expired'." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { error, data } = await supabase
      .from('members')
      .update({ membership_status: newStatus })
      .in('id', memberDbIds)
      .select('id'); 

    if (error) {
      return { successCount: 0, errorCount: memberDbIds.length, error: error.message };
    }
    
    const SCount = data ? data.length : 0;
    const ECount = memberDbIds.length - SCount;

    return { successCount: SCount, errorCount: ECount };

  } catch (e: any)
{
    return { successCount: 0, errorCount: memberDbIds.length, error: 'An unexpected error occurred during bulk status update.' };
  }
}


export async function sendBulkCustomEmailAction(
  memberDbIds: string[], 
  subject: string, 
  body: string,
  gymName: string,
  includeQrCode: boolean 
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
      .select('id, name, email, member_id') 
      .in('id', memberDbIds);

    if (fetchError) {
      return { attempted, successful, noEmailAddress, failed, error: `Failed to fetch member details: ${fetchError.message}` };
    }

    if (!members || members.length === 0) {
      return { attempted, successful, noEmailAddress, failed, error: "No matching members found for the provided IDs." };
    }

    for (const member of members) {
      if (member.email) {
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
        });

        if (emailResult.success) {
          successful++;
        } else {
          failed++;
        }
      } else {
        noEmailAddress++;
      }
    }
    return { attempted, successful, noEmailAddress, failed };

  } catch (e: any) {
    return { attempted, successful, noEmailAddress, failed, error: 'An unexpected error occurred while sending emails.' };
  }
}
    

