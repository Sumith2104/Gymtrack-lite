
'use server';

import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { Message } from '@/lib/types';
import { format } from 'date-fns';

/**
 * Fetches the conversation history between an admin (gym) and a specific member.
 */
export async function fetchMessagesAction(
  gymDatabaseId: string,
  adminFormattedGymId: string,
  memberUuid: string
): Promise<{ data?: Message[]; error?: string }> {
  if (!gymDatabaseId || !adminFormattedGymId || !memberUuid) {
    return { error: 'Gym ID, Admin ID, and Member ID are required to fetch conversation.' };
  }

  const supabase = createSupabaseServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('gym_id', gymDatabaseId)
      .or(
        `and(sender_id.eq.${adminFormattedGymId},sender_type.eq.admin,receiver_id.eq.${memberUuid},receiver_type.eq.member),and(sender_id.eq.${memberUuid},sender_type.eq.member,receiver_id.eq.${adminFormattedGymId},receiver_type.eq.admin)`
      )
      .order('created_at', { ascending: true });

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
  const supabase = createSupabaseServiceRoleClient();
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
