
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Announcement, Member, MembershipStatus } from '@/lib/types';
import { sendEmail } from '@/lib/email-service';
import { formatDateIST, parseValidISO } from '@/lib/date-utils';
import { differenceInDays, isValid } from 'date-fns';
import * as z from 'zod';

const announcementActionSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100),
  content: z.string().min(10, { message: 'Content must be at least 10 characters.' }).max(1000),
});

// Helper function to determine effective status for email filtering
function getEffectiveMembershipStatusForEmail(member: Pick<Member, 'membershipStatus' | 'expiryDate'>): MembershipStatus {
  if (member.membershipStatus === 'active' && member.expiryDate) {
    const expiry = parseValidISO(member.expiryDate);
    if (expiry && isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry <= 14 && daysUntilExpiry >= 0) return 'expiring soon';
      if (daysUntilExpiry < 0) return 'expired';
    }
  }
  const validStatuses: MembershipStatus[] = ['active', 'inactive', 'expired', 'pending', 'expiring soon'];
  if (validStatuses.includes(member.membershipStatus as MembershipStatus)) {
    return member.membershipStatus as MembershipStatus;
  }
  return 'inactive';
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
  ownerFormattedGymId: string, // Changed from gymId (UUID) to formatted_gym_id (text)
  title: string,
  content: string
): Promise<AddAnnouncementResponse> {
  console.log('[addAnnouncementAction] Received ownerFormattedGymId:', ownerFormattedGymId);
  console.log('[addAnnouncementAction] Received title:', title);

  if (!ownerFormattedGymId) {
    console.error('[addAnnouncementAction] Error: Formatted Gym ID is required.');
    return { error: "Formatted Gym ID is required to add an announcement." };
  }

  const validationResult = announcementActionSchema.safeParse({ title, content });
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    let errorMessages = Object.entries(fieldErrors)
      .map(([key, messages]) => `${key}: ${(messages as string[]).join(', ')}`)
      .join('; ');
    console.error('[addAnnouncementAction] Validation failed:', errorMessages);
    return { error: `Validation failed: ${errorMessages || 'Check inputs.'}` };
  }

  const validatedTitle = validationResult.data.title;
  const validatedContent = validationResult.data.content;

  const supabase = createSupabaseServerActionClient();

  // Fetch the gym's UUID (id) and name using the ownerFormattedGymId
  const { data: gymData, error: gymError } = await supabase
    .from('gyms')
    .select('id, name')
    .eq('formatted_gym_id', ownerFormattedGymId)
    .single();

  if (gymError || !gymData) {
    console.error('[addAnnouncementAction] Error fetching gym details by formatted_gym_id:', gymError?.message);
    return { error: gymError?.message || "Gym not found with the provided formatted ID." };
  }
  const gymUuid = gymData.id; // This is the actual UUID for the gym_id foreign key
  const gymNameForEmail = gymData.name;

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('[addAnnouncementAction] Error fetching Supabase user:', userError);
    } else {
      console.log('[addAnnouncementAction] Supabase user context during insert:', user ? { id: user.id, role: user.role, email: user.email, app_metadata: user.app_metadata } : 'No user session');
    }

    console.log('[addAnnouncementAction] Attempting to insert announcement with gym_id (UUID):', gymUuid, 'and formatted_gym_id:', ownerFormattedGymId);
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        gym_id: gymUuid, // The UUID FK
        formatted_gym_id: ownerFormattedGymId, // The new text column
        title: validatedTitle,
        content: validatedContent,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[addAnnouncementAction] Error adding announcement to DB:', error?.message);
      console.error('[addAnnouncementAction] Supabase error object:', JSON.stringify(error, null, 2));
      return { error: error?.message || "Failed to save announcement to database." };
    }

    console.log('[addAnnouncementAction] Announcement successfully added to DB:', data.id);
    const newAnnouncement: Announcement = {
        id: data.id,
        gymId: data.gym_id, // UUID
        formattedGymId: data.formatted_gym_id, // Formatted ID
        title: data.title,
        content: data.content,
        createdAt: data.created_at,
    };

    // Email broadcast logic (uses gymUuid for fetching members)
    let attempted = 0;
    let successful = 0;
    let noEmailAddress = 0;
    let failed = 0;

    const { data: membersToEmail, error: memberFetchError } = await supabase
      .from('members')
      .select('name, email, membership_status, expiry_date')
      .eq('gym_id', gymUuid); // Fetch members using the gym's UUID

    if (memberFetchError) {
      console.error("[addAnnouncementAction] Error fetching members for announcement email:", memberFetchError.message);
    } else if (membersToEmail && membersToEmail.length > 0) {
      for (const member of membersToEmail) {
        const effectiveStatus = getEffectiveMembershipStatusForEmail({
          membershipStatus: member.membership_status as MembershipStatus,
          expiryDate: member.expiry_date,
        });

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

    return {
        newAnnouncement,
        emailBroadcastResult: { attempted, successful, noEmailAddress, failed }
    };

  } catch (e: any) {
    console.error('[addAnnouncementAction] Unexpected error in addAnnouncementAction:', e.message);
    return { error: 'An unexpected error occurred while saving the announcement.' };
  }
}

export async function fetchAnnouncementsAction(ownerFormattedGymId: string | null): Promise<{ data?: Announcement[]; error?: string }> {
  console.log(`[fetchAnnouncementsAction] Received ownerFormattedGymId: ${ownerFormattedGymId} (type: ${typeof ownerFormattedGymId})`);

  if (!ownerFormattedGymId || typeof ownerFormattedGymId !== 'string' || ownerFormattedGymId.trim() === '') {
    console.error('[fetchAnnouncementsAction] Error: Valid Formatted Gym ID (text) is required. Received:', ownerFormattedGymId);
    return { error: "Valid Formatted Gym ID (text) is required to fetch announcements." };
  }

  const supabase = createSupabaseServerActionClient();
  let supabaseUserContext = 'N/A';
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      supabaseUserContext = `Error fetching user: ${userError.message}`;
    } else if (user) {
      supabaseUserContext = `User ID: ${user.id}, Role: ${user.role}, App Metadata: ${JSON.stringify(user.app_metadata)}`;
    } else {
      supabaseUserContext = 'No active Supabase user session.';
    }
  } catch (e: any) {
    supabaseUserContext = `Exception fetching user: ${e.message}`;
  }
  console.log(`[fetchAnnouncementsAction] Supabase user context during SELECT: ${supabaseUserContext}`);
  console.log(`[fetchAnnouncementsAction] Querying announcements for formatted_gym_id: ${ownerFormattedGymId}`);

  try {
    // TEMPORARY: Fetch ALL announcements to check if RLS SELECT is the issue or the filter itself
    // const { data: dbAnnouncements, error, count } = await supabase
    //   .from('announcements')
    //   .select('id, gym_id, formatted_gym_id, title, content, created_at', { count: 'exact' })
    // //   .eq('formatted_gym_id', ownerFormattedGymId) // Temporarily removed for debugging
    //   .order('created_at', { ascending: false });
    // console.log(`[fetchAnnouncementsAction] Raw Supabase query result (ALL announcements) - Error: ${JSON.stringify(error)}, Count: ${count}, Data (length): ${dbAnnouncements?.length}`);
    // if (dbAnnouncements && dbAnnouncements.length > 0) {
    //     console.log(`[fetchAnnouncementsAction] Preview of ALL fetched announcements: ${JSON.stringify(dbAnnouncements.slice(0,5).map(a => ({id: a.id, title: a.title, gym_id: a.gym_id, formatted_gym_id: a.formatted_gym_id})))}`);
    // }

    // Original query with filter by formatted_gym_id
    const { data: dbAnnouncements, error, count } = await supabase
      .from('announcements')
      .select('id, gym_id, formatted_gym_id, title, content, created_at', { count: 'exact' })
      .eq('formatted_gym_id', ownerFormattedGymId) // Filter by the new formatted_gym_id column
      .order('created_at', { ascending: false });

    console.log(`[fetchAnnouncementsAction] Raw Supabase query result (for formatted_gym_id ${ownerFormattedGymId}) - Error: ${JSON.stringify(error)}, Count: ${count}, Data (length): ${dbAnnouncements?.length}`);
    if (dbAnnouncements && dbAnnouncements.length > 0) {
        console.log(`[fetchAnnouncementsAction] Preview of fetched announcements (for formatted_gym_id ${ownerFormattedGymId}): ${JSON.stringify(dbAnnouncements.slice(0,5).map(a => ({id: a.id, title: a.title, gym_id: a.gym_id, formatted_gym_id: a.formatted_gym_id})))}`);
    }


    if (error) {
      console.error('[fetchAnnouncementsAction] Error fetching announcements from DB:', error.message);
      return { error: error.message };
    }
    if (!dbAnnouncements) {
        console.log(`[fetchAnnouncementsAction] No announcements found in DB for formatted_gym_id ${ownerFormattedGymId} (dbAnnouncements is null/undefined).`);
        return { data: [] };
    }
    if (dbAnnouncements.length === 0) {
        console.log(`[fetchAnnouncementsAction] No announcements found in DB for formatted_gym_id ${ownerFormattedGymId} (empty array).`);
    } else {
        console.log(`[fetchAnnouncementsAction] Found ${dbAnnouncements.length} announcements in DB for formatted_gym_id ${ownerFormattedGymId}.`);
    }

    const announcements: Announcement[] = dbAnnouncements.map(dbAnn => ({
        id: dbAnn.id,
        gymId: dbAnn.gym_id, // UUID
        formattedGymId: dbAnn.formatted_gym_id, // Formatted ID
        title: dbAnn.title,
        content: dbAnn.content,
        createdAt: dbAnn.created_at,
    }));
    return { data: announcements };

  } catch (e: any) {
    console.error('[fetchAnnouncementsAction] Unexpected error in fetchAnnouncementsAction:', e.message);
    return { error: 'An unexpected error occurred while fetching announcements.' };
  }
}

export async function deleteAnnouncementsAction(announcementIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (!announcementIds || announcementIds.length === 0) {
    return { success: false, error: "Announcement IDs are required for deletion." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .in('id', announcementIds);

    if (error) {
      console.error('Error deleting announcements from DB:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };

  } catch (e: any) {
    console.error('Unexpected error in deleteAnnouncementsAction:', e.message);
    return { success: false, error: 'An unexpected error occurred while deleting announcements.' };
  }
}
