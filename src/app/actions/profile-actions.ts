
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { MembershipType } from '@/lib/types';

export interface EarningsData {
  totalValueOfActivePlans: number; 
  currentMonthlyRevenue: number; 
  averageRevenuePerActiveMember: number;
  topPerformingPlanName: string | null;
  activeMemberCount: number;
}

interface RawMemberPlanData {
  membership_status: string; // Though we filter by active, it's good practice if the type reflects what could be selected
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
  const supabase = createSupabaseServerActionClient();

  try {
    // Fetch only active members for these calculations
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
      console.error('Error fetching active members for earnings data:', membersError.message);
      return { error: `DB error fetching active members: ${membersError.message}` };
    }

    // Initialize with default values, especially if no active members are found
    if (!membersData || membersData.length === 0) {
      return {
        data: {
          totalValueOfActivePlans: 0,
          currentMonthlyRevenue: 0,
          averageRevenuePerActiveMember: 0,
          topPerformingPlanName: null,
          activeMemberCount: 0,
        }
      };
    }

    let totalValueOfActivePlans = 0;
    let currentMonthlyRevenueSum = 0;
    const activeMemberCount = membersData.length;
    const planCounts: Record<string, number> = {};

    membersData.forEach((member: RawMemberPlanData) => {
      if (member.plans && member.plans.price > 0) {
        totalValueOfActivePlans += member.plans.price;

        // Calculate contribution to monthly revenue
        if (member.plans.duration_months && member.plans.duration_months > 0) {
          currentMonthlyRevenueSum += member.plans.price / member.plans.duration_months;
        } else if (member.plans.duration_months === 1) { 
           // Explicitly count 1-month plans as their full price for MRR
           currentMonthlyRevenueSum += member.plans.price;
        }
        // Note: Plans with null or 0 duration (other than 1) are complex for MRR.
        // This logic assumes duration_months is the period over which the price is spread for MRR.
        // E.g. A plan for $120 with duration_months = 12 contributes $10 to MRR.
        // A plan for $50 with duration_months = 1 contributes $50 to MRR.

        const planName = member.plans.plan_name || 'Unknown Plan';
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      }
    });

    const averageRevenuePerActiveMember = activeMemberCount > 0 ? currentMonthlyRevenueSum / activeMemberCount : 0;

    let topPerformingPlanName: string | null = null;
    if (Object.keys(planCounts).length > 0) {
      const topPlanEntry = Object.entries(planCounts).reduce(
        (top, current) => (current[1] > top[1] ? current : top),
        ['', 0] // Initialize with a dummy entry
      );
      if (topPlanEntry[0]) { // Check if a top plan was actually found
         topPerformingPlanName = topPlanEntry[0];
      }
    }
    
    return {
      data: {
        totalValueOfActivePlans: Math.round(totalValueOfActivePlans),
        currentMonthlyRevenue: Math.round(currentMonthlyRevenueSum),
        averageRevenuePerActiveMember: parseFloat(averageRevenuePerActiveMember.toFixed(2)),
        topPerformingPlanName: topPerformingPlanName,
        activeMemberCount,
      },
    };

  } catch (e: any) {
    console.error('Unexpected error in getGymEarningsData:', e.message);
    return { error: `Calculation error: ${e.message}` };
  }
}
