
'use server';

import { flux } from '@/lib/flux/client';
import type { Announcement, Member, MembershipStatus, EffectiveMembershipStatus } from '@/lib/types';
import { sendEmail } from '@/lib/email-service';
import { formatDateIST, parseValidISO } from '@/lib/date-utils';
import { differenceInDays, isValid } from 'date-fns';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

const announcementActionSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100),
  content: z.string().min(10, { message: 'Content must be at least 10 characters.' }).max(1000),
});

// Helper function to determine effective status for email filtering
function getEffectiveMembershipStatusForEmail(member: Pick<Member, 'membershipStatus' | 'expiryDate'>): EffectiveMembershipStatus {
  // Member.membershipStatus is DB status: 'active' or 'expired'
  if (member.membershipStatus === 'expired') {
    return 'expired';
  }
  if (member.membershipStatus === 'active' && member.expiryDate) {
    const expiry = parseValidISO(member.expiryDate);
    if (expiry && isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 14) return 'expiring soon'; // Includes day of expiry up to 14 days out
      return 'active';
    }
  }
  // Fallback: if status is 'active' but date is weird, consider active. Otherwise, expired.
  return member.membershipStatus === 'active' ? 'active' : 'expired';
}

interface AddAnnouncementResponse {
  newAnnouncement?: Announcement;
  error?: string;
  emailBroadcastResult?: {
    attempted: number;
    successful: number;
    noEmailAddress: number;
    failed: number;
  };
}

export async function addAnnouncementAction(
  ownerFormattedGymId: string,
  title: string,
  content: string,
  broadcastEmail: boolean = true // New parameter to control email broadcast
): Promise<AddAnnouncementResponse> {
  if (!ownerFormattedGymId) {
    return { error: "Formatted Gym ID is required to add an announcement." };
  }

  const validationResult = announcementActionSchema.safeParse({ title, content });
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    let errorMessages = Object.entries(fieldErrors)
      .map(([key, messages]) => `${key}: ${(messages as string[]).join(', ')}`)
      .join('; ');
    return { error: `Validation failed: ${errorMessages || 'Check inputs.'}` };
  }

  const validatedTitle = validationResult.data.title;
  const validatedContent = validationResult.data.content;

  // Clean inputs for SQL
  const safeTitle = validatedTitle.replace(/'/g, "''");
  const safeContent = validatedContent.replace(/'/g, "''");
  const safeGymId = ownerFormattedGymId.replace(/'/g, "''");

  try {
    // 1. Fetch Gym Details
    const gymQuery = `SELECT id, name FROM gyms WHERE formatted_gym_id = '${safeGymId}'`;
    const gymResult = await flux.sql(gymQuery);

    if (!gymResult.rows || gymResult.rows.length === 0) {
      return { error: `Gym not found with formatted ID: ${ownerFormattedGymId}.` };
    }

    const gymData = gymResult.rows[0];
    const gymUuid = gymData.id;
    const gymNameForEmail = gymData.name;

    // 2. Insert Announcement
    const newId = uuidv4();
    const createdAt = new Date().toISOString();

    const insertQuery = `
        INSERT INTO announcements (id, gym_id, formatted_gym_id, title, content, created_at)
        VALUES ('${newId}', '${gymUuid}', '${safeGymId}', '${safeTitle}', '${safeContent}', '${createdAt}')
      `;

    await flux.sql(insertQuery);

    const newAnnouncement: Announcement = {
      id: newId,
      gymId: gymUuid,
      formattedGymId: ownerFormattedGymId,
      title: validatedTitle,
      content: validatedContent,
      createdAt: createdAt,
    };

    let attempted = 0;
    let successful = 0;
    let noEmailAddress = 0;
    let failed = 0;

    if (broadcastEmail) { // Only proceed with email broadcast if flag is true
      // 3. Fetch Members for Email
      const memberQuery = `SELECT name, email, membership_status, expiry_date FROM members WHERE gym_id = '${gymUuid}'`;
      const membersResult = await flux.sql(memberQuery);

      const membersToEmail = membersResult.rows || [];

      if (membersToEmail.length > 0) {
        for (const member of membersToEmail) {
          const effectiveStatus = getEffectiveMembershipStatusForEmail({
            membershipStatus: member.membership_status as MembershipStatus, // Cast to DB status type
            expiryDate: member.expiry_date,
          });

          // Send email if effective status is 'active' or 'expiring soon'
          if (member.email && (effectiveStatus === 'active' || effectiveStatus === 'expiring soon')) {
            attempted++;
            const emailSubject = `New Announcement from ${gymNameForEmail}: ${newAnnouncement.title}`;
            const emailHtmlBody = `
                <p>Dear ${member.name || 'Member'},</p>
                <p>A new announcement has been posted at ${gymNameForEmail}:</p>
                <h2>${newAnnouncement.title}</h2>
                <p><em>Posted on: ${formatDateIST(newAnnouncement.createdAt, 'PP')}</em></p>
                <div class="announcement-content" style="padding: 10px; border-left: 3px solid #FFD700; margin: 10px 0; background-color: #222;">
                  ${newAnnouncement.content.replace(/\n/g, '<br />')}
                </div>
                <p>Please check the dashboard for more details.</p>
                <p>Regards,<br/>The ${gymNameForEmail} Team</p>
              `;
            const emailResult = await sendEmail({
              to: member.email,
              subject: emailSubject,
              htmlBody: emailHtmlBody,
              gymDatabaseId: gymUuid,
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
      }
    }

    return {
      newAnnouncement,
      emailBroadcastResult: { attempted, successful, noEmailAddress, failed }
    };

  } catch (e: any) {
    console.error("Add Announcement Error:", e);
    return { error: 'An unexpected error occurred while saving the announcement.' };
  }
}

export async function fetchAnnouncementsAction(ownerFormattedGymId: string | null): Promise<{ data?: Announcement[]; error?: string }> {
  if (!ownerFormattedGymId || typeof ownerFormattedGymId !== 'string' || ownerFormattedGymId.trim() === '') {
    return { error: "Valid Formatted Gym ID (text) is required to fetch announcements." };
  }

  const safeGymId = ownerFormattedGymId.replace(/'/g, "''");

  try {
    const query = `
        SELECT id, gym_id, formatted_gym_id, title, content, created_at 
        FROM announcements 
        WHERE formatted_gym_id = '${safeGymId}' 
        ORDER BY created_at DESC
    `;

    const result = await flux.sql(query);

    if (!result.rows) {
      return { data: [] };
    }

    const announcements: Announcement[] = result.rows.map((dbAnn: any) => ({
      id: dbAnn.id,
      gymId: dbAnn.gym_id,
      formattedGymId: dbAnn.formatted_gym_id,
      title: dbAnn.title,
      content: dbAnn.content,
      createdAt: dbAnn.created_at,
    }));
    return { data: announcements };

  } catch (e: any) {
    console.error("Fetch Announcement Error:", e);
    return { error: 'An unexpected error occurred while fetching announcements.' };
  }
}

export async function deleteAnnouncementsAction(announcementIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (!announcementIds || announcementIds.length === 0) {
    return { success: false, error: "Announcement IDs are required for deletion." };
  }

  try {
    // Sanitize IDs
    const safeIds = announcementIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');

    const query = `DELETE FROM announcements WHERE id IN (${safeIds})`;
    await flux.sql(query);

    return { success: true };

  } catch (e: any) {
    console.error("Delete Announcement Error:", e);
    return { success: false, error: 'An unexpected error occurred while deleting announcements.' };
  }
}
