'use server';

import type { Member, FormattedCheckIn, CheckIn, MembershipType, MembershipStatus, EffectiveMembershipStatus } from '@/lib/types';
import { differenceInDays, isValid, parseISO, addHours } from 'date-fns';
import { flux } from '@/lib/flux/client';
import { v4 as uuidv4 } from 'uuid';


function getEffectiveStatusForCheckin(member: Member): EffectiveMembershipStatus {
  if (member.membershipStatus === 'expired') {
    return 'expired';
  }
  if (member.membershipStatus === 'active' && member.expiryDate) {
    const expiry = parseISO(member.expiryDate);
    if (isValid(expiry)) {
      const daysUntilExpiry = differenceInDays(expiry, new Date());
      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 14) return 'expiring soon';
      return 'active';
    }
  }
  return member.membershipStatus === 'active' ? 'active' : 'expired'; // Fallback
}

function mapDbMemberToAppMember(dbMember: any): Member {
  const planDetails = dbMember.plans; // This may be null if we don't join
  return {
    id: dbMember.id,
    gymId: dbMember.gym_id,
    planId: dbMember.plan_id,
    memberId: dbMember.member_id,
    name: dbMember.name,
    email: dbMember.email,
    membershipStatus: dbMember.membership_status as MembershipStatus, // 'active' or 'expired' from DB
    createdAt: dbMember.created_at,
    age: dbMember.age,
    phoneNumber: dbMember.phone_number,
    joinDate: dbMember.join_date,
    expiryDate: dbMember.expiry_date,
    membershipType: dbMember.membership_type as MembershipType || 'Other',
    planPrice: planDetails?.price || 0,
  };
}


export async function findMemberForCheckInAction(identifier: string, gymDatabaseId: string): Promise<{ member?: Member; error?: string }> {
  if (!identifier || !gymDatabaseId) {
    return { error: "Member identifier and Gym ID are required." };
  }

  try {
    const query = `
      SELECT * 
      FROM members 
      WHERE member_id = '${identifier}' 
      AND gym_id = '${gymDatabaseId}' 
    `;
    const result = await flux.sql(query);

    if (!result.rows || result.rows.length === 0) {
      return { error: "Member not found at this gym." };
    }
    const dbMember = result.rows[0];

    const member = mapDbMemberToAppMember(dbMember);
    const effectiveStatus = getEffectiveStatusForCheckin(member);

    if (effectiveStatus === 'expired') {
      return { error: `Membership for ${member.name} is expired. Please see reception.` };
    }
    // 'active' and 'expiring soon' are allowed to proceed to check-in recording

    return { member };

  } catch (e: any) {
    return { error: 'An unexpected error occurred while finding the member.' };
  }
}

export async function recordCheckInAction(memberTableUuid: string, gymDatabaseId: string): Promise<{ success: boolean; checkInTime?: string; checkOutTime?: string; checkInRecordId?: string; error?: string }> {
  if (!memberTableUuid || !gymDatabaseId) {
    return { success: false, error: "Member UUID and Gym ID are required to record check-in." };
  }

  try {
    // 1. Fetch gym session settings
    const settingsQuery = `
      SELECT session_time_hours 
      FROM gyms 
      WHERE id = '${gymDatabaseId}'
    `;
    const settingsResult = await flux.sql(settingsQuery);

    if (!settingsResult.rows || settingsResult.rows.length === 0) {
      return { success: false, error: "Could not retrieve gym session settings to record check-in." };
    }
    const gymData = settingsResult.rows[0];

    // 2. Check for an existing ACTIVE check-in to prevent duplicates
    const now = new Date();
    const activeCheckQuery = `
      SELECT count(*) as count 
      FROM check_ins 
      WHERE member_table_id = '${memberTableUuid}' 
      AND gym_id = '${gymDatabaseId}' 
      AND check_out_time > '${now.toISOString()}'
    `;
    const activeCheckResult = await flux.sql(activeCheckQuery);

    if (activeCheckResult.rows && activeCheckResult.rows[0].count > 0) {
      return { success: false, error: "Member already has an active check-in session." };
    }

    // 3. Insert new check-in record
    const sessionHours = gymData.session_time_hours || 2; // Default to 2 hours if not set
    const checkInTime = new Date();
    const checkOutTime = addHours(checkInTime, sessionHours);
    const newCheckInId = uuidv4();
    const createdAt = new Date().toISOString();

    const insertQuery = `
      INSERT INTO check_ins (
        id, 
        member_table_id, 
        gym_id, 
        check_in_time, 
        check_out_time, 
        created_at
      ) VALUES (
        '${newCheckInId}', 
        '${memberTableUuid}', 
        '${gymDatabaseId}', 
        '${checkInTime.toISOString()}', 
        '${checkOutTime.toISOString()}', 
        '${createdAt}'
      )
    `;

    await flux.sql(insertQuery);

    return { success: true, checkInTime: checkInTime.toISOString(), checkOutTime: checkOutTime.toISOString(), checkInRecordId: newCheckInId };

  } catch (e: any) {
    return { success: false, error: 'An unexpected error occurred while recording the check-in.' };
  }
}


export async function fetchAllCheckInsForKioskAction(gymDatabaseId: string, gymName: string): Promise<{ checkIns: FormattedCheckIn[]; error?: string }> {
  if (!gymDatabaseId) return { checkIns: [], error: "Gym ID is required." };

  try {
    const query = `
      SELECT ci.id, ci.member_table_id, ci.check_in_time, ci.check_out_time, ci.created_at, m.name, m.member_id
      FROM check_ins ci
      LEFT JOIN members m ON ci.member_table_id = m.id
      WHERE ci.gym_id = '${gymDatabaseId}'
      ORDER BY ci.check_in_time DESC
      LIMIT 100
    `;

    const result = await flux.sql(query);

    if (!result.rows) {
      return { checkIns: [] };
    }

    // Map Fluxbase results to FormattedCheckIn
    const formattedCheckIns: FormattedCheckIn[] = result.rows.map((ci: any) => ({
      checkInRecordId: ci.id,
      memberTableId: ci.member_table_id,
      memberName: ci.name || 'Unknown Member',
      memberId: ci.member_id || 'N/A',
      checkInTime: new Date(ci.check_in_time),
      checkOutTime: ci.check_out_time ? new Date(ci.check_out_time) : null,
      createdAt: new Date(ci.created_at),
      gymName: gymName,
    }));

    return { checkIns: formattedCheckIns };

  } catch (e: any) {
    return { checkIns: [], error: 'Failed to fetch check-ins.' };
  }
}
