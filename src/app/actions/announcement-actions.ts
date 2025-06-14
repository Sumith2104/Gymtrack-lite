
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

// Helper function to determine effective status, similar to one in members-table
// This is simplified for email filtering and might need adjustment for perfect parity
function getEffectiveMembershipStatusForEmail(member: Pick<Member, 'membershipStatus' | 'expiryDate'>): MembershipStatus {
  if (member.membershipStatus === 'active' && member.expiryDate) {
    const expiry = parseValidISO(member.expiryDate);
    if (expiry && isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry <= 14 && daysUntilExpiry >= 0) return 'expiring soon';
      if (daysUntilExpiry < 0) return 'expired'; // This member wouldn't be 'active' to begin with if properly managed
    }
  }
  // Explicitly cast to MembershipStatus if the input status is one of the valid enum values.
  const validStatuses: MembershipStatus[] = ['active', 'inactive', 'expired', 'pending', 'expiring soon'];
  if (validStatuses.includes(member.membershipStatus as MembershipStatus)) {
    return member.membershipStatus as MembershipStatus;
  }
  return 'inactive'; // Default or handle as error
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

export async function addAnnouncementAction(gymId: string, title: string, content: string): Promise<AddAnnouncementResponse> {
  if (!gymId) { // gymId check remains
    return { error: "Gym ID is required to add an announcement." };
  }

  // Server-side validation
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

  const supabase = createSupabaseServerActionClient();
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert({ gym_id: gymId, title: validatedTitle, content: validatedContent, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding announcement to DB:', error?.message);
      return { error: error?.message || "Failed to save announcement to database." };
    }
    
    const newAnnouncement: Announcement = {
        id: data.id,
        gymId: data.gym_id,
        title: data.title,
        content: data.content,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };

    // Email broadcast logic
    let attempted = 0;
    let successful = 0;
    let noEmailAddress = 0;
    let failed = 0;

    const { data: membersToEmail, error: memberFetchError } = await supabase
      .from('members')
      .select('name, email, membership_status, expiry_date') 
      .eq('gym_id', gymId);
      
    if (memberFetchError) {
      console.error("Error fetching members for announcement email:", memberFetchError.message);
    } else if (membersToEmail && membersToEmail.length > 0) {
      const gymDetails = await supabase.from('gyms').select('name').eq('id', gymId).single();
      const gymName = gymDetails.data?.name || 'Your Gym';

      for (const member of membersToEmail) {
        const effectiveStatus = getEffectiveMembershipStatusForEmail({
          membershipStatus: member.membership_status as MembershipStatus,
          expiryDate: member.expiry_date,
        });
        
        if (member.email && (effectiveStatus === 'active' || effectiveStatus === 'expiring soon')) {
          attempted++;
          const emailSubject = `New Announcement from ${gymName}: ${newAnnouncement.title}`;
          // Use 'PP' format for email date: e.g., "Aug 15, 2023"
          const emailHtmlBody = `
            <p>Dear ${member.name || 'Member'},</p>
            <p>A new announcement has been posted at ${gymName}:</p>
            <h2>${newAnnouncement.title}</h2>
            <p><em>Posted on: ${formatDateIST(newAnnouncement.createdAt, 'PP')}</em></p>
            <div class="announcement-content">
              ${newAnnouncement.content.replace(/\n/g, '<br />')}
            </div>
            <p>Please check the dashboard for more details.</p>
            <p>Regards,<br/>The ${gymName} Team</p>
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
    console.error('Unexpected error in addAnnouncementAction:', e.message);
    return { error: 'An unexpected error occurred while saving the announcement.' };
  }
}

export async function fetchAnnouncementsAction(gymId: string): Promise<{ data?: Announcement[]; error?: string }> {
  if (!gymId) {
    return { error: "Gym ID is required to fetch announcements." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: dbAnnouncements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements from DB:', error.message);
      return { error: error.message };
    }
     if (!dbAnnouncements) {
        return { data: [] };
    }

    const announcements: Announcement[] = dbAnnouncements.map(dbAnn => ({
        id: dbAnn.id,
        gymId: dbAnn.gym_id,
        title: dbAnn.title,
        content: dbAnn.content,
        createdAt: dbAnn.created_at,
        updatedAt: dbAnn.updated_at,
    }));
    return { data: announcements };

  } catch (e: any) {
    console.error('Unexpected error in fetchAnnouncementsAction:', e.message);
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
