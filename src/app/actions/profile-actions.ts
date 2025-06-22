
'use server';

import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { MembershipType } from '@/lib/types';

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
  plans: {
    price: number;
    duration_months: number | null;
    plan_name: string;
  } | null;
}

export async function getGymEarningsData(gymDatabaseId: string): Promise<{ data?: EarningsData; error?: string }> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided.' };
  }
  const supabase = createSupabaseServiceRoleClient();

  try {
    // Fetch all active plan definitions for the gym
    const { data: activePlanDefinitions, error: planDefinitionsError } = await supabase
      .from('plans')
      .select('price')
      .eq('gym_id', gymDatabaseId)
      .eq('is_active', true);

    if (planDefinitionsError) {
      return { error: `DB error fetching plan definitions: ${planDefinitionsError.message}` };
    }

    let totalValueOfActivePlanDefinitions = 0;
    if (activePlanDefinitions) {
      activePlanDefinitions.forEach(plan => {
        totalValueOfActivePlanDefinitions += plan.price || 0;
      });
    }
    
    // Fetch active members and their plan details for other metrics
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select(`
        membership_status,
        plans (
          price,
          duration_months,
          plan_name
        )
      `)
      .eq('gym_id', gymDatabaseId)
      .eq('membership_status', 'active'); 

    if (membersError) {
      return { error: `DB error fetching active members: ${membersError.message}` };
    }
    
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
      if (member.plans && member.plans.price > 0) {
        currentMonthlyRevenueFromMembers += member.plans.price; 

        const planName = member.plans.plan_name || 'Unknown Plan';
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
  const supabase = createSupabaseServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('gyms')
      .select('payment_id')
      .eq('id', gymDatabaseId)
      .single();

    if (error) {
        // This specific error code means the column doesn't exist.
        if (error.code === '42703') { 
            return { upiId: null, error: "The 'payment_id' column does not exist in the 'gyms' table. Please update your database schema." };
        }
        throw error;
    };
    return { upiId: data?.payment_id ?? null };
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
  
  const supabase = createSupabaseServiceRoleClient();
  try {
    const { error } = await supabase
      .from('gyms')
      .update({ payment_id: upiId })
      .eq('id', gymDatabaseId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update UPI ID.' };
  }
}

export async function getGymSmtpSettings(gymDatabaseId: string): Promise<{ data?: SmtpSettings; error?: string }> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided.' };
  }
  const supabase = createSupabaseServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('gyms')
      .select('app_host, port, app_email, app_pass, from_email')
      .eq('id', gymDatabaseId)
      .single();

    if (error) throw error;
    return { data };
  } catch (e: any) {
    return { error: e.message || 'Failed to fetch SMTP settings.' };
  }
}

export async function updateGymSmtpSettings(gymDatabaseId: string, settings: Partial<SmtpSettings>): Promise<{ success: boolean; error?: string }> {
  if (!gymDatabaseId) {
    return { success: false, error: 'Gym ID not provided.' };
  }
  
  const supabase = createSupabaseServiceRoleClient();
  try {
    const updatePayload: Partial<SmtpSettings> = {};

    if (settings.hasOwnProperty('app_host')) updatePayload.app_host = settings.app_host || null;
    if (settings.hasOwnProperty('port')) updatePayload.port = settings.port || null;
    
    // When app_email is updated, also update from_email to match.
    if (settings.hasOwnProperty('app_email')) {
      const email = settings.app_email || null;
      updatePayload.app_email = email;
      updatePayload.from_email = email;
    }

    // Only include app_pass in the update if it's a non-empty string.
    if (settings.app_pass && settings.app_pass.length > 0) {
      updatePayload.app_pass = settings.app_pass;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: true }; // Nothing to update
    }

    const { error } = await supabase
      .from('gyms')
      .update(updatePayload)
      .eq('id', gymDatabaseId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update SMTP settings.' };
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
  
  const supabase = createSupabaseServiceRoleClient();
  try {
    const { error } = await supabase
      .from('gyms')
      .update({ owner_email: newEmail })
      .eq('id', gymDatabaseId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update owner email.' };
  }
}
