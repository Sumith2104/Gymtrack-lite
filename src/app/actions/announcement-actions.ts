
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Announcement } from '@/lib/types';

export async function addAnnouncementAction(gymId: string, title: string, content: string): Promise<{ newAnnouncement?: Announcement; error?: string }> {
  if (!gymId || !title || !content) {
    return { error: "Gym ID, title, and content are required to add an announcement." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert({ gym_id: gymId, title, content, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding announcement to DB:', error?.message);
      return { error: error?.message || "Failed to save announcement to database." };
    }
    // Map DB response to Announcement type
    const newAnnouncement: Announcement = {
        id: data.id,
        gymId: data.gym_id,
        title: data.title,
        content: data.content,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
    return { newAnnouncement };

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
