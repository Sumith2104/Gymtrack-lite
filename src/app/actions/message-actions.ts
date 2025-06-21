
'use server';

import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { Message, MessageSenderType, MessageReceiverType } from '@/lib/types';
import { format } from 'date-fns';

/**
 * Fetches the conversation history between an admin (gym) and a specific member.
 * Uses the member's human-readable memberId.
 */
export async function fetchMessagesAction(
  gymDatabaseId: string,
  adminFormattedGymId: string,
  memberIdentifier: string // This is members.member_id (human-readable ID)
): Promise<{ data?: Message[]; error?: string }> {
  if (!gymDatabaseId || !adminFormattedGymId || !memberIdentifier) {
    return { error: 'Gym DB ID, Admin Formatted ID, and Member Identifier are required to fetch conversation.' };
  }

  const supabase = createSupabaseServiceRoleClient();
  try {
    const { data: dbMessages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('gym_id', gymDatabaseId)
      .or( // Messages where admin sent to member OR member sent to admin
        `and(sender_id.eq.${adminFormattedGymId},sender_type.eq.admin,receiver_id.eq.${memberIdentifier},receiver_type.eq.member),and(sender_id.eq.${memberIdentifier},sender_type.eq.member,receiver_id.eq.${adminFormattedGymId},receiver_type.eq.admin)`
      )
      .order('created_at', { ascending: true });

    if (error) {
      return { error: error.message };
    }
    if (!dbMessages) {
        return { data: [] };
    }

    const messages: Message[] = dbMessages.map(dbMsg => ({
        id: dbMsg.id,
        gymId: dbMsg.gym_id,
        formattedGymId: dbMsg.formatted_gym_id ?? undefined,
        senderId: dbMsg.sender_id,
        receiverId: dbMsg.receiver_id,
        senderType: dbMsg.sender_type as MessageSenderType,
        receiverType: dbMsg.receiver_type as MessageReceiverType,
        content: dbMsg.content,
        createdAt: dbMsg.created_at,
        readAt: dbMsg.read_at,
    }));

    return { data: messages };
  } catch (e: any) {
    return { error: 'Failed to fetch messages due to an unexpected error.' };
  }
}

/**
 * Sends a message from an admin (gym owner) to a specific member.
 * Uses the member's human-readable memberId as receiver_id.
 */
export async function sendMessageAction(
  gymDatabaseId: string,
  adminSenderFormattedGymId: string, 
  memberReceiverIdentifier: string, // This is members.member_id (human-readable ID)
  content: string
): Promise<{ newMessage?: Message; error?: string }> {
  if (!gymDatabaseId || !adminSenderFormattedGymId || !memberReceiverIdentifier || !content.trim()) {
    return { error: 'Gym DB ID, Admin Sender Formatted ID, Member Receiver Identifier, and message content are required.' };
  }

  const supabase = createSupabaseServiceRoleClient();

  try {
    const { data: dbNewMessage, error } = await supabase
      .from('messages')
      .insert({
        gym_id: gymDatabaseId,
        formatted_gym_id: adminSenderFormattedGymId,
        sender_id: adminSenderFormattedGymId, // Admin is the sender
        sender_type: 'admin',
        receiver_id: memberReceiverIdentifier, // Member's human-readable ID is the receiver
        receiver_type: 'member',
        content: content.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !dbNewMessage) {
      return { error: error?.message || 'Failed to send message.' };
    }

    const newMessage: Message = {
        id: dbNewMessage.id,
        gymId: dbNewMessage.gym_id,
        formattedGymId: dbNewMessage.formatted_gym_id ?? undefined,
        senderId: dbNewMessage.sender_id,
        receiverId: dbNewMessage.receiver_id,
        senderType: dbNewMessage.sender_type as MessageSenderType,
        receiverType: dbNewMessage.receiver_type as MessageReceiverType,
        content: dbNewMessage.content,
        createdAt: dbNewMessage.created_at,
        readAt: dbNewMessage.read_at,
    };
    return { newMessage };
  } catch (e: any) {
    return { error: 'Failed to send message due to an unexpected error.' };
  }
}

/**
 * Marks messages as read for a specific receiver up to a certain message ID or timestamp.
 * Receiver ID can be member's human-readable ID or admin's formatted_gym_id.
 */
export async function markMessagesAsReadAction(
  gymDatabaseId: string,
  receiverIdentifier: string, // Can be member_id or formatted_gym_id
  messageIdsToUpdate: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!gymDatabaseId || !receiverIdentifier || messageIdsToUpdate.length === 0) {
    return { success: false, error: 'Gym ID, receiver identifier, and message IDs are required.' };
  }
  const supabase = createSupabaseServiceRoleClient();
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('gym_id', gymDatabaseId)
      .eq('receiver_id', receiverIdentifier)
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
