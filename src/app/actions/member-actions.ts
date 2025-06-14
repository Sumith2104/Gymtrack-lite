
'use server';

import { addMonths, format } from 'date-fns';
import type { Member, MembershipStatus, FetchedMembershipPlan, MemberWithPlanDetails } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { addAnnouncementAction } from './announcement-actions'; 

interface AddMemberServerResponse {
  data?: {
    newMember: Member;
    emailStatus: string;
  };
  error?: string;
}

function mapDbMemberToAppMember(dbMember: any): Member {
  const planDetails = dbMember.plans;
  return {
    id: dbMember.id,
    gymId: dbMember.gym_id,
    planId: dbMember.plan_id,
    memberId: dbMember.member_id,
    name: dbMember.name,
    email: dbMember.email,
    membershipStatus: dbMember.membership_status,
    createdAt: dbMember.created_at,
    age: dbMember.age,
    phoneNumber: dbMember.phone_number,
    joinDate: dbMember.join_date,
    expiryDate: dbMember.expiry_date,
    membershipType: planDetails?.plan_name as MembershipType || 'Other',
    planPrice: planDetails?.price || 0,
  };
}


export async function addMember(
  formData: AddMemberFormValues,
  gymDatabaseId: string,
  gymName: string
): Promise<AddMemberServerResponse> {
  const supabase = createSupabaseServerActionClient();
  try {
    const validationResult = addMemberFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      let errorMessages = Object.entries(fieldErrors)
        .map(([key, messages]) => `${key}: ${(messages as string[]).join(', ')}`)
        .join('; ');
      return { error: `Validation failed: ${errorMessages || 'Check inputs.'}` };
    }

    const { name, email, phoneNumber, age, selectedPlanUuid } = validationResult.data;

    const { data: planDetails, error: planError } = await supabase
      .from('plans')
      .select('plan_name, price, duration_months')
      .eq('id', selectedPlanUuid)
      .eq('is_active', true)
      .single();

    if (planError || !planDetails) {
      return { error: `Invalid or inactive membership plan. Details: ${planError?.message || 'Plan not found.'}` };
    }
    if (planDetails.duration_months === null || planDetails.duration_months === undefined) {
        return { error: `Selected plan '${planDetails.plan_name}' has an invalid duration.`};
    }

    const joinDate = new Date();
    const expiryDate = addMonths(joinDate, planDetails.duration_months);
    const memberIdSuffix = Date.now().toString().slice(-4) + Math.random().toString(36).substring(2, 3).toUpperCase();
    const memberId = `${gymName.substring(0, 3).toUpperCase()}${name.substring(0,2).toUpperCase()}${memberIdSuffix}`.substring(0, 10);


    const newMemberForDb = {
      gym_id: gymDatabaseId,
      plan_id: selectedPlanUuid,
      member_id: memberId,
      name,
      email,
      phone_number: phoneNumber,
      age,
      membership_status: 'active' as MembershipStatus,
      join_date: joinDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
      membership_type: planDetails.plan_name as MembershipType,
    };

    const { data: insertedMemberData, error: insertError } = await supabase
      .from('members')
      .insert(newMemberForDb)
      .select('*, plans (plan_name, price, duration_months)') 
      .single();

    if (insertError || !insertedMemberData) {
      return { error: `Failed to add member to database: ${insertError?.message || "Unknown DB error."}`};
    }

    const newMemberAppFormat = mapDbMemberToAppMember(insertedMemberData);

    let emailStatus = 'No email address provided.';
    if (newMemberAppFormat.email) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(newMemberAppFormat.memberId)}`;
      console.log(`SIMULATING: Sending Welcome Email to: ${newMemberAppFormat.email}`);
      console.log(`  Subject: Welcome to ${gymName}! Your Member ID: ${newMemberAppFormat.memberId}. QR: ${qrCodeUrl}`);
      emailStatus = `Welcome email simulation for ${newMemberAppFormat.email} initiated.`;
    }

    const announcementTitle = `Welcome New Member: ${newMemberAppFormat.name}!`;
    const announcementContent = `Let's all give a warm welcome to ${newMemberAppFormat.name} (ID: ${newMemberAppFormat.memberId}), who joined us on ${format(new Date(newMemberAppFormat.joinDate!), 'PP')} with a ${newMemberAppFormat.membershipType || 'new'} membership! We're excited to have them in the ${gymName} community.`;
    
    const announcementResult = await addAnnouncementAction(gymDatabaseId, announcementTitle, announcementContent);
    if (announcementResult.error) {
      console.error("Failed to create welcome announcement in DB:", announcementResult.error);
    } else {
      console.log("Welcome announcement created in DB:", announcementResult.newAnnouncement?.id);
    }

    return { data: { newMember: newMemberAppFormat, emailStatus } };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `Error in addMember: ${errorMessage}` };
  }
}

interface EditMemberServerResponse {
  data?: { updatedMember: Member; message: string; };
  error?: string;
}

export async function editMember(
  formData: AddMemberFormValues,
  memberOriginalDbId: string, 
  gymDatabaseId: string
): Promise<EditMemberServerResponse> {
  const supabase = createSupabaseServerActionClient();
  try {
    const validationResult = addMemberFormSchema.safeParse(formData);
    if (!validationResult.success) {
      return { error: `Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}` };
    }
    const { name, email, phoneNumber, age, selectedPlanUuid } = validationResult.data;

    const { data: existingMember, error: fetchError } = await supabase
      .from('members')
      .select('join_date, member_id') 
      .eq('id', memberOriginalDbId)
      .single();

    if (fetchError || !existingMember) {
        return { error: `Member with ID ${memberOriginalDbId} not found. ${fetchError?.message || ''}`};
    }
    
    const { data: planDetails, error: planError } = await supabase
      .from('plans')
      .select('plan_name, price, duration_months')
      .eq('id', selectedPlanUuid)
      .eq('is_active', true)
      .single();

    if (planError || !planDetails) {
      return { error: `Invalid or inactive new membership plan. Details: ${planError?.message || 'Plan not found.'}` };
    }
    if (planDetails.duration_months === null || planDetails.duration_months === undefined) {
        return { error: `Selected new plan '${planDetails.plan_name}' has an invalid duration.`};
    }
    
    const joinDateForCalc = new Date(existingMember.join_date!); 
    const expiryDate = addMonths(joinDateForCalc, planDetails.duration_months);

    const memberUpdateForDb = {
      name,
      email,
      phone_number: phoneNumber,
      age,
      plan_id: selectedPlanUuid,
      membership_type: planDetails.plan_name as MembershipType,
      expiry_date: expiryDate.toISOString(),
    };

    const { data: updatedMemberData, error: updateError } = await supabase
      .from('members')
      .update(memberUpdateForDb)
      .eq('id', memberOriginalDbId)
      .select('*, plans (plan_name, price, duration_months)')
      .single();

    if (updateError || !updatedMemberData) {
      return { error: `Failed to update member: ${updateError?.message || "Unknown DB error."}` };
    }
    
    const updatedMemberAppFormat = mapDbMemberToAppMember(updatedMemberData);
    return { data: { updatedMember: updatedMemberAppFormat, message: "Member details updated." } };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `Error in editMember: ${errorMessage}` };
  }
}


export async function fetchMembers(gymDatabaseId: string): Promise<{ data?: Member[]; error?: string }> {
  if (!gymDatabaseId) return { error: "Gym ID is required to fetch members." };
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: dbMembers, error } = await supabase
      .from('members')
      .select('*, plans (plan_name, price, duration_months)') 
      .eq('gym_id', gymDatabaseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error.message);
      return { error: error.message };
    }
    if (!dbMembers) {
        return { data: [] };
    }
    
    const members = dbMembers.map(mapDbMemberToAppMember);
    return { data: members };

  } catch (e: any) {
    console.error('Unexpected error in fetchMembers:', e.message);
    return { error: 'Failed to fetch members due to an unexpected error.' };
  }
}

export async function deleteMemberAction(memberDbId: string): Promise<{ success: boolean; error?: string }> {
  if (!memberDbId) return { success: false, error: "Member ID is required for deletion." };
  const supabase = createSupabaseServerActionClient();
  try {
    const { error } = await supabase.from('members').delete().eq('id', memberDbId);
    if (error) {
      console.error('Error deleting member:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Unexpected error deleting member:', e.message);
    return { success: false, error: 'Failed to delete member due to an unexpected error.' };
  }
}

export async function updateMemberStatusAction(memberDbId: string, newStatus: MembershipStatus): Promise<{ updatedMember?: Member; error?: string }> {
  if (!memberDbId || !newStatus) return { error: "Member ID and new status are required." };
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: updatedDbMember, error } = await supabase
      .from('members')
      .update({ membership_status: newStatus })
      .eq('id', memberDbId)
      .select('*, plans (plan_name, price, duration_months)') 
      .single();

    if (error || !updatedDbMember) {
      console.error('Error updating member status:', error?.message);
      return { error: error?.message || "Failed to update member status or member not found." };
    }
    const updatedMemberAppFormat = mapDbMemberToAppMember(updatedDbMember);
    return { updatedMember: updatedMemberAppFormat };
  } catch (e: any) {
    console.error('Unexpected error updating member status:', e.message);
    return { error: 'Failed to update status due to an unexpected error.' };
  }
}

export async function deleteMembersAction(memberDbIds: string[]): Promise<{ successCount: number; errorCount: number; error?: string }> {
  if (!memberDbIds || memberDbIds.length === 0) {
    return { successCount: 0, errorCount: 0, error: "No member IDs provided for deletion." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { error, count } = await supabase
      .from('members')
      .delete()
      .in('id', memberDbIds);

    if (error) {
      console.error('Error bulk deleting members:', error.message);
      return { successCount: 0, errorCount: memberDbIds.length, error: error.message };
    }
    // The 'count' returned by Supabase delete might be the number of rows affected or null.
    // For simplicity, if no error, assume all specified were targeted.
    // A more robust check might involve checking `count`.
    return { successCount: memberDbIds.length, errorCount: 0 };

  } catch (e: any) {
    console.error('Unexpected error in deleteMembersAction:', e.message);
    return { successCount: 0, errorCount: memberDbIds.length, error: 'An unexpected error occurred during bulk deletion.' };
  }
}

export async function bulkUpdateMemberStatusAction(memberDbIds: string[], newStatus: MembershipStatus): Promise<{ successCount: number; errorCount: number; error?: string }> {
  if (!memberDbIds || memberDbIds.length === 0) {
    return { successCount: 0, errorCount: 0, error: "No member IDs provided for status update." };
  }
  if (!newStatus) {
    return { successCount: 0, errorCount: memberDbIds.length, error: "New status is required." };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { error, data } = await supabase
      .from('members')
      .update({ membership_status: newStatus })
      .in('id', memberDbIds)
      .select('id'); // Select only 'id' to count affected rows

    if (error) {
      console.error('Error bulk updating member statuses:', error.message);
      return { successCount: 0, errorCount: memberDbIds.length, error: error.message };
    }
    
    // `data` will be an array of objects like [{id: '...'}, {id: '...'}] for successfully updated rows
    const SCount = data ? data.length : 0;
    const ECount = memberDbIds.length - SCount;

    return { successCount: SCount, errorCount: ECount };

  } catch (e: any) {
    console.error('Unexpected error in bulkUpdateMemberStatusAction:', e.message);
    return { successCount: 0, errorCount: memberDbIds.length, error: 'An unexpected error occurred during bulk status update.' };
  }
}
