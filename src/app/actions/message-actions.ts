
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
  adminSenderId: string, // This is the gym owner's auth.users.id (or equivalent UUID)
  memberReceiverId: string, // This is the member's table UUID (members.id)
  content: string
): Promise<{ newMessage?: Message; error?: string }> {
  if (!gymDatabaseId || !adminSenderId || !memberReceiverId || !content.trim()) {
    return { error: 'Gym ID, admin sender ID, member receiver ID, and message content are required.' };
  }
  
  const supabase = createSupabaseServerActionClient();

  // The adminSenderId is now passed directly, so no need to call supabase.auth.getUser() here.
  // We trust the client (MessagesPage) to provide the correct adminSenderId obtained during its login/auth flow.

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        gym_id: gymDatabaseId,
        sender_id: adminSenderId, 
        sender_type: 'admin',
        receiver_id: memberReceiverId, 
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
