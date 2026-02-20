'use server';

import type { MembershipType } from '@/lib/types';
import * as z from 'zod';
import { flux } from '@/lib/flux/client';

export interface EarningsData {
  totalValueOfActivePlans: number;
  currentMonthlyRevenue: number;
  averageRevenuePerActiveMember: number;
  topPerformingPlanName: string | null;
  activeMemberCount: number;
}

export interface SmtpSettings {
  app_host: string | null;
  port: string | null;
  app_email: string | null;
  app_pass: string | null;
  from_email: string | null;
}

interface RawMemberPlanData {
  membership_status: string;
  price: number;
  duration_months: number | null;
  plan_name: string;
}

export async function getGymEarningsData(gymDatabaseId: string): Promise<{ data?: EarningsData; error?: string }> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided.' };
  }

  try {
    // Fetch active plan definitions for the gym
    const activePlansQuery = `
      SELECT price 
      FROM plans 
      WHERE gym_id = '${gymDatabaseId}' 
      AND is_active = true
    `;
    const activePlansResult = await flux.sql(activePlansQuery);
    const activePlanDefinitions = activePlansResult.rows;

    let totalValueOfActivePlanDefinitions = 0;
    if (activePlanDefinitions) {
      activePlanDefinitions.forEach((plan: any) => {
        totalValueOfActivePlanDefinitions += plan.price || 0;
      });
    }

    // Fetch active members and their plan details for other metrics
    const membersQuery = `
      SELECT m.membership_status, p.price, p.duration_months, p.plan_name
      FROM members m
      LEFT JOIN plans p ON m.plan_id = p.id
      WHERE m.gym_id = '${gymDatabaseId}'
      AND m.membership_status = 'active'
    `;
    const membersResult = await flux.sql(membersQuery);
    const membersData = membersResult.rows;

    if (!membersData || membersData.length === 0) {
      return {
        data: {
          totalValueOfActivePlans: Math.round(totalValueOfActivePlanDefinitions),
          currentMonthlyRevenue: 0,
          averageRevenuePerActiveMember: 0,
          topPerformingPlanName: null,
          activeMemberCount: 0,
        }
      };
    }

    let currentMonthlyRevenueFromMembers = 0;
    const activeMemberCount = membersData.length;
    const planCounts: Record<string, number> = {};

    membersData.forEach((member: RawMemberPlanData) => {
      if (member.price > 0) {
        currentMonthlyRevenueFromMembers += member.price;

        const planName = member.plan_name || 'Unknown Plan';
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      }
    });

    const averageRevenuePerActiveMember = activeMemberCount > 0 ? currentMonthlyRevenueFromMembers / activeMemberCount : 0;

    let topPerformingPlanName: string | null = null;
    if (Object.keys(planCounts).length > 0) {
      const topPlanEntry = Object.entries(planCounts).reduce(
        (top, current) => (current[1] > top[1] ? current : top),
        ['', 0]
      );
      if (topPlanEntry[0]) {
        topPerformingPlanName = topPlanEntry[0];
      }
    }

    return {
      data: {
        totalValueOfActivePlans: Math.round(totalValueOfActivePlanDefinitions),
        currentMonthlyRevenue: Math.round(currentMonthlyRevenueFromMembers),
        averageRevenuePerActiveMember: parseFloat(averageRevenuePerActiveMember.toFixed(2)),
        topPerformingPlanName: topPerformingPlanName,
        activeMemberCount,
      },
    };

  } catch (e: any) {
    return { error: `Calculation error: ${e.message}` };
  }
}

export async function getGymUpiId(gymDatabaseId: string): Promise<{ upiId: string | null; error?: string }> {
  if (!gymDatabaseId) {
    return { upiId: null, error: 'Gym ID not provided.' };
  }
  try {
    const query = `SELECT payment_id FROM gyms WHERE id = '${gymDatabaseId}'`;
    const result = await flux.sql(query);

    if (result.rows && result.rows.length > 0) {
      return { upiId: result.rows[0].payment_id || null };
    }
    return { upiId: null };
  } catch (e: any) {
    return { upiId: null, error: e.message || 'Failed to fetch UPI ID.' };
  }
}

export async function updateGymUpiId(gymDatabaseId: string, upiId: string | null): Promise<{ success: boolean; error?: string }> {
  if (!gymDatabaseId) {
    return { success: false, error: 'Gym ID not provided.' };
  }

  if (upiId && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
    return { success: false, error: 'Invalid UPI ID format. It should be like "user@bank".' };
  }

  try {
    const updateQuery = `
      UPDATE gyms 
      SET payment_id = ${upiId ? `'${upiId}'` : 'NULL'} 
      WHERE id = '${gymDatabaseId}'
    `;
    await flux.sql(updateQuery);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update UPI ID.' };
  }
}

export async function getGymSmtpSettings(gymDatabaseId: string): Promise<{ data?: SmtpSettings; error?: string }> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided.' };
  }
  try {
    const query = `
      SELECT app_host, port, app_email, app_pass, from_email 
      FROM gyms 
      WHERE id = '${gymDatabaseId}'
    `;
    const result = await flux.sql(query);

    if (result.rows && result.rows.length > 0) {
      return { data: result.rows[0] };
    }
    return { error: 'Gym not found.' };
  } catch (e: any) {
    return { error: e.message || 'Failed to fetch SMTP settings.' };
  }
}

export async function getSuperAdminSmtpSettings(): Promise<{ data?: Partial<SmtpSettings>; error?: string }> {
  try {
    const query = `
      SELECT smtp_host, smtp_port, smtp_username, smtp_from 
      FROM super_admins 
      LIMIT 1
    `;
    const result = await flux.sql(query);

    if (!result.rows || result.rows.length === 0) {
      return { error: 'Super admin configuration not found.' };
    }

    const superAdmin = result.rows[0];
    return {
      data: {
        app_host: superAdmin.smtp_host,
        port: superAdmin.smtp_port,
        app_email: superAdmin.smtp_username, // Map smtp_username to app_email
        from_email: superAdmin.smtp_from,
        app_pass: null // Never return the password
      }
    };
  } catch (e: any) {
    return { error: e.message || 'Failed to fetch default SMTP settings.' };
  }
}

export async function updateGymSmtpSettings(gymDatabaseId: string, settings: Partial<SmtpSettings>): Promise<{ success: boolean; error?: string }> {
  if (!gymDatabaseId) {
    return { success: false, error: 'Gym ID not provided.' };
  }

  try {
    const updates: string[] = [];
    if (settings.hasOwnProperty('app_host')) updates.push(`app_host = ${settings.app_host ? `'${settings.app_host}'` : 'NULL'}`);
    if (settings.hasOwnProperty('port')) updates.push(`port = ${settings.port ? `'${settings.port}'` : 'NULL'}`);

    // When app_email is updated, also update from_email to match.
    if (settings.hasOwnProperty('app_email')) {
      const email = settings.app_email || null;
      updates.push(`app_email = ${email ? `'${email}'` : 'NULL'}`);
      updates.push(`from_email = ${email ? `'${email}'` : 'NULL'}`);
    }

    // Only include app_pass in the update if it's a non-empty string.
    if (settings.app_pass && settings.app_pass.length > 0) {
      updates.push(`app_pass = '${settings.app_pass}'`);
    }

    if (updates.length === 0) {
      return { success: true }; // Nothing to update
    }

    const updateQuery = `
      UPDATE gyms 
      SET ${updates.join(', ')} 
      WHERE id = '${gymDatabaseId}'
    `;
    await flux.sql(updateQuery);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update SMTP settings.' };
  }
}

export async function revertToDefaultSmtpSettings(gymDatabaseId: string): Promise<{ success: boolean; error?: string; data?: { app_email: string | null } }> {
  if (!gymDatabaseId) {
    return { success: false, error: 'Gym ID not provided.' };
  }
  try {
    // 1. Get default settings from super_admins, including password
    const superAdminQuery = `
      SELECT smtp_host, smtp_port, smtp_username, smtp_pass, smtp_from 
      FROM super_admins 
      LIMIT 1
    `;
    const superAdminResult = await flux.sql(superAdminQuery);

    if (!superAdminResult.rows || superAdminResult.rows.length === 0) {
      return { success: false, error: 'Could not load default SMTP configuration from the system.' };
    }
    const superAdmin = superAdminResult.rows[0];

    // 2. Prepare update payload for the gym
    const app_host = superAdmin.smtp_host ? `'${superAdmin.smtp_host}'` : 'NULL';
    const port = superAdmin.smtp_port ? `'${superAdmin.smtp_port}'` : 'NULL';
    const app_email = superAdmin.smtp_username ? `'${superAdmin.smtp_username}'` : 'NULL';
    const app_pass = superAdmin.smtp_pass ? `'${superAdmin.smtp_pass}'` : 'NULL';
    const from_email = superAdmin.smtp_from ? `'${superAdmin.smtp_from}'` : 'NULL';

    // 3. Update the gym's settings with the default values
    const updateQuery = `
      UPDATE gyms 
      SET 
        app_host = ${app_host},
        port = ${port},
        app_email = ${app_email},
        app_pass = ${app_pass},
        from_email = ${from_email}
      WHERE id = '${gymDatabaseId}'
    `;
    await flux.sql(updateQuery);

    return { success: true, data: { app_email: superAdmin.smtp_username || null } };
  } catch (e: any) {
    return { success: false, error: e.message || 'An unexpected error occurred while reverting settings.' };
  }
}


export async function updateOwnerEmail(gymDatabaseId: string, newEmail: string): Promise<{ success: boolean; error?: string }> {
  if (!gymDatabaseId) {
    return { success: false, error: 'Gym ID not provided.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!newEmail || !emailRegex.test(newEmail)) {
    return { success: false, error: 'Invalid email format. Please enter a valid email.' };
  }

  try {
    const updateQuery = `UPDATE gyms SET owner_email = '${newEmail}' WHERE id = '${gymDatabaseId}'`;
    await flux.sql(updateQuery);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update owner email.' };
  }
}

export interface GymSettings {
  sessionTimeHours: number | null;
  maxCapacity: number | null;
}

export async function getGymSettings(gymDatabaseId: string): Promise<{ data?: GymSettings; error?: string }> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided.' };
  }
  try {
    const query = `
      SELECT session_time_hours, max_capacity 
      FROM gyms 
      WHERE id = '${gymDatabaseId}'
    `;
    const result = await flux.sql(query);

    if (result.rows && result.rows.length > 0) {
      return {
        data: {
          sessionTimeHours: result.rows[0].session_time_hours,
          maxCapacity: result.rows[0].max_capacity,
        }
      };
    }
    return { error: 'Gym not found' };
  } catch (e: any) {
    return { error: e.message || 'Failed to fetch gym settings.' };
  }
}

const settingsUpdateSchema = z.object({
  sessionTimeHours: z.number().int().min(1).max(24).optional(),
  maxCapacity: z.number().int().min(1).max(10000).optional(),
});


export async function updateGymSettings(gymDatabaseId: string, settings: Partial<GymSettings>): Promise<{ success: boolean; error?: string }> {
  if (!gymDatabaseId) {
    return { success: false, error: 'Gym ID not provided.' };
  }

  const validationResult = settingsUpdateSchema.safeParse(settings);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.flatten().fieldErrors.toString() }
  }

  try {
    const updates: string[] = [];
    if (validationResult.data.sessionTimeHours !== undefined) {
      updates.push(`session_time_hours = ${validationResult.data.sessionTimeHours}`);
    }
    if (validationResult.data.maxCapacity !== undefined) {
      updates.push(`max_capacity = ${validationResult.data.maxCapacity}`);
    }

    if (updates.length === 0) {
      return { success: true }; // Nothing to update
    }

    const updateQuery = `
      UPDATE gyms 
      SET ${updates.join(', ')} 
      WHERE id = '${gymDatabaseId}'
    `;
    await flux.sql(updateQuery);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update gym settings.' };
  }
}
