
'use server';

import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'; // Changed to service role client
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
  // For fetching messages, RLS should ideally be used.
  // If using service role here, ensure it's necessary or secure with filters.
  // For now, keeping the server action client for reads, assuming RLS is set up for reads.
  // Or, if service role is needed universally, switch this too and add robust filters.
  const supabase = createSupabaseServiceRoleClient(); // Or createSupabaseServerActionClient() if RLS for reads is fine
  try {
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
  adminSenderFormattedGymId: string, // This is the gym's formatted_gym_id (e.g., STEELFIT123)
  memberReceiverUuid: string, // This is the member's table UUID (members.id)
  content: string
): Promise<{ newMessage?: Message; error?: string }> {
  if (!gymDatabaseId || !adminSenderFormattedGymId || !memberReceiverUuid || !content.trim()) {
    return { error: 'Gym Database ID, Admin Sender Gym ID, Member Receiver UUID, and message content are required.' };
  }
  
  // Use the service role client to bypass RLS for this trusted server operation
  const supabase = createSupabaseServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        gym_id: gymDatabaseId,
        sender_id: adminSenderFormattedGymId, 
        sender_type: 'admin',
        receiver_id: memberReceiverUuid, 
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
  const supabase = createSupabaseServiceRoleClient(); // Or regular client if RLS allows receiver to update
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
