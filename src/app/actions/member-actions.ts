'use server';

import { addMonths, differenceInDays, isValid, parseISO, format, subMonths, startOfMonth, eachMonthOfInterval, endOfMonth } from 'date-fns';
import type { Member, MembershipStatus, EffectiveMembershipStatus, AttendanceSummary, MonthlyCheckin } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';
import { flux } from '@/lib/flux/client';
import { addAnnouncementAction } from './announcement-actions';
import { sendEmail } from '@/lib/email-service';
import { formatDateIST, parseValidISO } from '@/lib/date-utils';
import { v4 as uuidv4 } from 'uuid';

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
  const planDetails = dbMember.plans ? dbMember.plans : { plan_name: dbMember.plan_name, price: dbMember.plan_price, duration_months: dbMember.plan_duration_months };
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

    // Fetch Plan Details
    const planQuery = `
      SELECT plan_name, price, duration_months 
      FROM plans 
      WHERE id = '${selectedPlanUuid}' 
      AND gym_id = '${gymDatabaseId}' 
      AND is_active = true
    `;
    const planResult = await flux.sql(planQuery);

    if (!planResult.rows || planResult.rows.length === 0) {
      return { error: `Invalid or inactive membership plan.` };
    }

    const planDetails = planResult.rows[0];

    if (planDetails.duration_months === null || planDetails.duration_months === undefined) {
      return { error: `Selected plan '${planDetails.plan_name}' has an invalid duration.` };
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

    const newMemberId = uuidv4();
    const createdAt = new Date().toISOString();

    const safeName = name.replace(/'/g, "''");
    const safeEmail = email ? email.replace(/'/g, "''") : '';
    const safePhone = phoneNumber ? phoneNumber.replace(/'/g, "''") : '';
    const safeMemberId = memberId.replace(/'/g, "''");
    const safeMembershipType = planDetails.plan_name.replace(/'/g, "''");

    const insertQuery = `
      INSERT INTO members (
        id, gym_id, plan_id, member_id, name, email, phone_number, age, 
        membership_status, membership_type, join_date, expiry_date, created_at
      ) VALUES (
        '${newMemberId}', '${gymDatabaseId}', '${selectedPlanUuid}', '${safeMemberId}', '${safeName}', 
        ${safeEmail ? `'${safeEmail}'` : 'NULL'}, ${safePhone ? `'${safePhone}'` : 'NULL'}, ${age || 'NULL'}, 
        'active', '${safeMembershipType}', '${joinDate.toISOString()}', '${expiryDate.toISOString()}', '${createdAt}'
      )
    `;

    await flux.sql(insertQuery);

    // Construct the App Member object directly since we just inserted it
    const newMemberAppFormat: Member = {
      id: newMemberId,
      gymId: gymDatabaseId,
      planId: selectedPlanUuid,
      memberId: memberId,
      name: name,
      email: email || null,
      phoneNumber: phoneNumber || null,
      age: age || null,
      membershipStatus: 'active',
      createdAt: createdAt,
      joinDate: joinDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      membershipType: planDetails.plan_name,
      planPrice: planDetails.price,
      profileUrl: null
    };

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
  try {
    const validationResult = addMemberFormSchema.safeParse(formData);
    if (!validationResult.success) {
      return { error: `Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}` };
    }
    const { name, email, phoneNumber, age, selectedPlanUuid } = validationResult.data;

    let existingMemberQuery = `
      SELECT id, join_date, member_id, membership_status 
      FROM members 
      WHERE id = '${memberOriginalDbId}' 
      AND gym_id = '${gymDatabaseId}'
    `;
    let existingMemberResult = await flux.sql(existingMemberQuery);

    if (!existingMemberResult.rows || existingMemberResult.rows.length === 0) {
      // Fallback for stale frontend cache (where plan_id was sent instead of id)
      const fallbackQuery = `
        SELECT id, join_date, member_id, membership_status 
        FROM members 
        WHERE plan_id = '${memberOriginalDbId}' 
        AND gym_id = '${gymDatabaseId}'
        LIMIT 1
      `;
      const fallbackResult = await flux.sql(fallbackQuery);

      if (!fallbackResult.rows || fallbackResult.rows.length === 0) {
        return { error: `Member with ID ${memberOriginalDbId} not found at this gym.` };
      }

      existingMemberResult = fallbackResult;
    }

    const existingMember = existingMemberResult.rows[0];
    const actualMemberDbId = existingMember?.id;
    console.log("[DEBUG editMember] existingMember:", existingMember);
    console.log("[DEBUG editMember] actualMemberDbId:", actualMemberDbId);

    if (!actualMemberDbId) {
      return { error: "Failed to resolve actual member ID from query." };
    }


    const planQuery = `
      SELECT plan_name, price, duration_months 
      FROM plans 
      WHERE id = '${selectedPlanUuid}' 
      AND gym_id = '${gymDatabaseId}' 
      AND is_active = true
          `;
    const planResult = await flux.sql(planQuery);

    if (!planResult.rows || planResult.rows.length === 0) {
      return { error: `Invalid or inactive new membership plan.` };
    }
    const planDetails = planResult.rows[0];

    if (planDetails.duration_months === null || planDetails.duration_months === undefined) {
      return { error: `Selected new plan '${planDetails.plan_name}' has an invalid duration.` };
    }

    const joinDateForCalc = existingMember.join_date ? parseValidISO(existingMember.join_date) : new Date();
    if (!joinDateForCalc) {
      return { error: "Could not parse existing member's join date." }
    }
    const expiryDate = addMonths(joinDateForCalc, planDetails.duration_months);

    const safeName = name.replace(/'/g, "''");
    const safeEmail = email ? email.replace(/'/g, "''") : '';
    const safePhone = phoneNumber ? phoneNumber.replace(/'/g, "''") : '';
    const safePlanName = planDetails.plan_name.replace(/'/g, "''");

    const updateQuery = `
      UPDATE members
        SET
        name = '${safeName}',
          email = ${safeEmail ? `'${safeEmail}'` : 'NULL'},
        phone_number = ${safePhone ? `'${safePhone}'` : 'NULL'},
        age = ${age || 'NULL'},
        plan_id = '${selectedPlanUuid}',
          expiry_date = '${expiryDate.toISOString()}',
          membership_status = 'active',
          membership_type = '${safePlanName}'
      WHERE id = '${actualMemberDbId}'
          `;

    console.log("[DEBUG editMember] Running updateQuery:", updateQuery);
    const updateRes = await flux.sql(updateQuery);
    console.log("[DEBUG editMember] Update Result:", updateRes);

    // Fetch updated member to return
    const fetchUpdatedQuery = `
        SELECT
        m.id, m.gym_id, m.plan_id, m.member_id, m.name, m.email, m.phone_number, m.age,
          m.membership_status, m.membership_type, m.join_date, m.expiry_date, m.created_at, m.profile_url,
          p.plan_name, p.price, p.duration_months
        FROM members m
        LEFT JOIN plans p ON m.plan_id = p.id
        WHERE m.id = '${actualMemberDbId}'
          `;

    const updatedResult = await flux.sql(fetchUpdatedQuery);

    if (!updatedResult.rows || updatedResult.rows.length === 0) {
      return { error: "Failed to retrieve updated member." };
    }

    // Process joined data from manual SQL if necessary, but here we can map
    // Note: flux.sql returns flatted rows if joined, or nested if specific structure
    // Assuming simple flat return since we did manual join or the server handles it.
    // Actually, SQL Engine returns flat rows for joins usually.
    // Let's adapt mapDbMemberToAppMember to handle the joined columns: plan_name, price, duration_months

    const updatedMemberData = {
      ...updatedResult.rows[0],
      plans: {
        plan_name: updatedResult.rows[0].plan_name,
        price: updatedResult.rows[0].price,
        duration_months: updatedResult.rows[0].duration_months
      }
    };

    const updatedMemberAppFormat = mapDbMemberToAppMember(updatedMemberData);
    return { data: { updatedMember: updatedMemberAppFormat, message: "Member details updated." } };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `Error in editMember: ${errorMessage} ` };
  }
}


export async function fetchMembers(gymDatabaseId: string): Promise<{ data?: Member[]; error?: string }> {
  if (!gymDatabaseId) return { error: "Gym ID is required to fetch members." };
  try {
    const query = `
        SELECT
        m.id, m.gym_id, m.plan_id, m.member_id, m.name, m.email, m.phone_number, m.age,
          m.membership_status, m.membership_type, m.join_date, m.expiry_date, m.created_at, m.profile_url,
          p.plan_name, p.price, p.duration_months
      FROM members m
      LEFT JOIN plans p ON m.plan_id = p.id
      WHERE m.gym_id = '${gymDatabaseId}'
      ORDER BY m.created_at DESC
    `;

    const result = await flux.sql(query);

    if (!result.rows) {
      return { data: [] };
    }

    const members = result.rows.map((row: any) => {
      // Reconstruct hierarchical object if needed for the mapper
      const memberWithPlan = {
        ...row,
        plans: {
          plan_name: row.plan_name,
          price: row.price,
          duration_months: row.duration_months
        }
      };
      return mapDbMemberToAppMember(memberWithPlan);
    });

    return { data: members };

  } catch (e: any) {
    console.error("Fetch Members Error:", e);
    return { error: 'Failed to fetch members due to an unexpected error.' };
  }
}

export async function deleteMemberAction(memberDbId: string): Promise<{ success: boolean; error?: string }> {
  if (!memberDbId) return { success: false, error: "Member ID is required for deletion." };

  try {
    // Delete check-ins first
    const deleteCheckinsQuery = `DELETE FROM check_ins WHERE member_table_id = '${memberDbId}'`;
    await flux.sql(deleteCheckinsQuery);

    // Delete member
    const deleteMemberQuery = `DELETE FROM members WHERE id = '${memberDbId}'`;
    await flux.sql(deleteMemberQuery);

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

  try {
    const updateQuery = `
      UPDATE members 
      SET membership_status = '${newStatus}' 
      WHERE id = '${memberDbId}'
          `;
    await flux.sql(updateQuery);

    const fetchQuery = `
        SELECT
        m.id, m.gym_id, m.plan_id, m.member_id, m.name, m.email, m.phone_number, m.age,
          m.membership_status, m.membership_type, m.join_date, m.expiry_date, m.created_at, m.profile_url,
          p.plan_name, p.price, p.duration_months,
          g.name as gym_name
      FROM members m
      LEFT JOIN plans p ON m.plan_id = p.id
      LEFT JOIN gyms g ON m.gym_id = g.id
      WHERE m.id = '${memberDbId}'
          `;

    const result = await flux.sql(fetchQuery);

    if (!result.rows || result.rows.length === 0) {
      return { error: "Failed to update member status or member not found." };
    }

    const updatedDbMember = result.rows[0];
    const memberWithPlan = {
      ...updatedDbMember,
      plans: {
        plan_name: updatedDbMember.plan_name,
        price: updatedDbMember.price,
        duration_months: updatedDbMember.duration_months
      }
    };

    const gymName = updatedDbMember.gym_name;
    const updatedMemberAppFormat = mapDbMemberToAppMember(memberWithPlan);

    // Send email notification
    if (updatedMemberAppFormat.email && gymName) {
      const emailSubject = `Your Membership Status at ${gymName} has been Updated`;

      let statusExplanation = '';
      switch (newStatus) {
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

  let SCount = 0;
  let ECount = 0;
  let lastError: string | undefined = undefined;

  for (const memberId of memberDbIds) {
    try {
      const deleteCheckinsQuery = `DELETE FROM check_ins WHERE member_table_id = '${memberId}'`;
      await flux.sql(deleteCheckinsQuery);

      const deleteMemberQuery = `DELETE FROM members WHERE id = '${memberId}'`;
      await flux.sql(deleteMemberQuery);

      SCount++;
    } catch (e: any) {
      ECount++;
      lastError = e.message;
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

  const idList = memberDbIds.map(id => `'${id}'`).join(',');

  try {
    // 1. Fetch members that will be updated to get their email and name
    const fetchQuery = `
        SELECT m.id, m.name, m.email, m.gym_id, g.name as gym_name
        FROM members m
        LEFT JOIN gyms g ON m.gym_id = g.id
        WHERE m.id IN(${idList})
          `;
    const fetchResult = await flux.sql(fetchQuery);

    if (!fetchResult.rows || fetchResult.rows.length === 0) {
      return { successCount: 0, errorCount: memberDbIds.length, emailSentCount: 0, error: 'No matching members found to update.' };
    }

    const membersToUpdate = fetchResult.rows;

    // 2. Perform the update
    const updateQuery = `
        UPDATE members 
        SET membership_status = '${newStatus}'
        WHERE id IN(${idList})
      `;
    await flux.sql(updateQuery);

    // Since Flux update doesn't typically return modified rows in the same way, assume success for all if no error thrown
    const successCount = membersToUpdate.length;
    const errorCount = memberDbIds.length - successCount;

    // 3. Send emails
    let emailSentCount = 0;
    let statusExplanation = '';
    switch (newStatus) {
      case 'active': statusExplanation = 'Your membership has been set to <strong>Active</strong>. You can continue to enjoy all the facilities.'; break;
      case 'expired': statusExplanation = 'Your membership has been set to <strong>Expired</strong>. Please visit the reception to renew your plan and regain access.'; break;
    }

    for (const member of membersToUpdate) {
      if (member.email) {
        const gymName = member.gym_name;
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

    return { successCount, errorCount, emailSentCount };

  } catch (e: any) {
    return { successCount: 0, errorCount: memberDbIds.length, emailSentCount: 0, error: `Failed to update members: ${e.message} ` };
  }
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

  let attempted = 0;
  let successful = 0;
  let noEmailAddress = 0;
  let failed = 0;

  const idList = memberDbIds.map(id => `'${id}'`).join(',');


  try {
    const query = `
        SELECT id, name, email, member_id, membership_status, expiry_date
        FROM members
        WHERE id IN(${idList})
          `;
    const result = await flux.sql(query);

    if (!result.rows || result.rows.length === 0) {
      return { attempted, successful, noEmailAddress, failed, error: "No matching members found for the provided IDs." };
    }
    const members = result.rows;

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
  try {
    const query = `
      SELECT check_in_time
      FROM check_ins
      WHERE member_table_id = '${memberDbId}'
      ORDER BY check_in_time DESC
    `;
    const result = await flux.sql(query);

    const checkIns = result.rows || [];

    if (checkIns.length === 0) {
      return {
        data: {
          totalCheckIns: 0,
          lastCheckInTime: null,
          recentCheckIns: [],
        },
      };
    }

    const recentCheckInDates = checkIns.slice(0, 5).map((ci: { check_in_time: string }) => parseISO(ci.check_in_time));

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
  try {
    const query = `
      SELECT 
        m.id, m.gym_id, m.plan_id, m.member_id, m.name, m.email, m.phone_number, m.age, 
        m.membership_status, m.membership_type, m.join_date, m.expiry_date, m.created_at, m.profile_url,
        p.plan_name, p.price, p.duration_months
      FROM members m
      LEFT JOIN plans p ON m.plan_id = p.id
      WHERE m.id = '${memberDbId}'
    `;
    const result = await flux.sql(query);

    if (!result.rows || result.rows.length === 0) {
      return { error: "Member not found." };
    }

    const dbMember = result.rows[0];
    const memberWithPlan = {
      ...dbMember,
      plans: {
        plan_name: dbMember.plan_name,
        price: dbMember.price,
        duration_months: dbMember.duration_months
      }
    };

    const member = mapDbMemberToAppMember(memberWithPlan);
    return { data: member };

  } catch (e: any) {
    return { error: `An unexpected error occurred: ${e.message}` };
  }
}

export async function getMemberCheckinHistory(memberDbId: string): Promise<{ data?: MonthlyCheckin[]; error?: string }> {
  if (!memberDbId) {
    return { error: 'Member ID is required.' };
  }

  const today = new Date();
  const twelveMonthsAgo = subMonths(today, 11);
  const startOfInterval = startOfMonth(twelveMonthsAgo);

  try {
    const query = `
        SELECT check_in_time 
        FROM check_ins 
        WHERE member_table_id = '${memberDbId}' 
        AND check_in_time >= '${startOfInterval.toISOString()}'
    `;

    const result = await flux.sql(query);
    const checkIns = result.rows || [];

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
