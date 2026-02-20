'use server';

import type { Message, MessageSenderType, MessageReceiverType } from '@/lib/types';
import { flux } from '@/lib/flux/client';
import { v4 as uuidv4 } from 'uuid';

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

  try {
    const query = `
      SELECT * 
      FROM messages 
      WHERE gym_id = '${gymDatabaseId}' 
      AND (
        (sender_id = '${adminFormattedGymId}' AND sender_type = 'admin' AND receiver_id = '${memberIdentifier}' AND receiver_type = 'member')
        OR
        (sender_id = '${memberIdentifier}' AND sender_type = 'member' AND receiver_id = '${adminFormattedGymId}' AND receiver_type = 'admin')
      )
      ORDER BY created_at ASC
    `;

    const result = await flux.sql(query);

    if (!result.rows) {
      return { data: [] };
    }

    const messages: Message[] = result.rows.map((dbMsg: any) => ({
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

  try {
    const newMessageId = uuidv4();
    const createdAt = new Date().toISOString();
    const cleanContent = content.trim().replace(/'/g, "''");

    const insertQuery = `
      INSERT INTO messages (
        id,
        gym_id,
        formatted_gym_id,
        sender_id,
        sender_type,
        receiver_id,
        receiver_type,
        content,
        created_at
      ) VALUES (
        '${newMessageId}',
        '${gymDatabaseId}',
        '${adminSenderFormattedGymId}',
        '${adminSenderFormattedGymId}',
        'admin',
        '${memberReceiverIdentifier}',
        'member',
        '${cleanContent}',
        '${createdAt}'
      )
    `;

    await flux.sql(insertQuery);

    const newMessage: Message = {
      id: newMessageId,
      gymId: gymDatabaseId,
      formattedGymId: adminSenderFormattedGymId,
      senderId: adminSenderFormattedGymId,
      receiverId: memberReceiverIdentifier,
      senderType: 'admin',
      receiverType: 'member',
      content: content.trim(),
      createdAt: createdAt,
      readAt: null,
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

  const idList = messageIdsToUpdate.map(id => `'${id}'`).join(',');

  try {
    const updateQuery = `
      UPDATE messages 
      SET read_at = '${new Date().toISOString()}' 
      WHERE gym_id = '${gymDatabaseId}' 
      AND receiver_id = '${receiverIdentifier}' 
      AND id IN (${idList}) 
      AND read_at IS NULL
    `;

    await flux.sql(updateQuery);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: 'Failed to mark messages as read.' };
  }
}
