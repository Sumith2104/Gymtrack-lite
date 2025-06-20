
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { Message } from '@/lib/types';

/**
 * Fetches messages for the current gym owner or a specific member.
 * This is a placeholder and will need more sophisticated logic for conversation grouping.
 */
export async function fetchMessagesAction(
  gymDatabaseId: string,
  userId: string, 
  userType: 'admin' | 'member'
): Promise<{ data?: Message[]; error?: string }> {
  if (!gymDatabaseId || !userId) {
    return { error: 'Gym ID and User ID are required.' };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    // A more complex query will be needed to fetch conversations (e.g., group by sender/receiver pairs)
    // This is a simplified version fetching all messages related to the user for the gym
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('gym_id', gymDatabaseId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }
    return { data: data as Message[] };
  } catch (e: any) {
    return { error: 'Failed to fetch messages due to an unexpected error.' };
  }
}

/**
 * Sends a message from an admin (gym owner) to a specific member.
 */
export async function sendMessageAction(
  gymDatabaseId: string,
  memberReceiverId: string, // This is the member's table UUID (members.id)
  content: string
): Promise<{ newMessage?: Message; error?: string }> {
  if (!gymDatabaseId || !memberReceiverId || !content.trim()) {
    return { error: 'Gym ID, member receiver ID, and message content are required.' };
  }
  
  const supabase = createSupabaseServerActionClient();

  // Get the authenticated admin's user ID
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Could not authenticate admin. Please log in again.' };
  }
  const adminSenderId = user.id; // This is the auth.users.id of the admin

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        gym_id: gymDatabaseId,
        sender_id: adminSenderId, // Admin's auth user ID
        sender_type: 'admin',
        receiver_id: memberReceiverId, // Member's table UUID
        receiver_type: 'member',
        content: content.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      return { error: error?.message || 'Failed to send message.' };
    }
    return { newMessage: data as Message };
  } catch (e: any) {
    return { error: 'Failed to send message due to an unexpected error.' };
  }
}

/**
 * Marks messages as read for a specific receiver up to a certain message ID or timestamp.
 */
export async function markMessagesAsReadAction(
  gymDatabaseId: string,
  receiverId: string,
  messageIdsToUpdate: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!gymDatabaseId || !receiverId || messageIdsToUpdate.length === 0) {
    return { success: false, error: 'Gym ID, receiver ID, and message IDs are required.' };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('gym_id', gymDatabaseId)
      .eq('receiver_id', receiverId)
      .in('id', messageIdsToUpdate)
      .is('read_at', null); 

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: 'Failed to mark messages as read.' };
  }
}
