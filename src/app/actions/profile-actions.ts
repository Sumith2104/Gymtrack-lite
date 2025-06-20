
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
  const supabase = createSupabaseServerActionClient();

  try {
    
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
          totalValueOfActivePlans: 0,
          currentMonthlyRevenue: 0,
          averageRevenuePerActiveMember: 0,
          topPerformingPlanName: null,
          activeMemberCount: 0,
        }
      };
    }

    let totalValueOfActivePlans = 0;
    let currentMonthlyRevenueSum = 0; // Will also sum full plan prices for active members
    const activeMemberCount = membersData.length;
    const planCounts: Record<string, number> = {};

    membersData.forEach((member: RawMemberPlanData) => {
      if (member.plans && member.plans.price > 0) {
        totalValueOfActivePlans += member.plans.price;
        currentMonthlyRevenueSum += member.plans.price; // Now reflects sum of full plan prices for active members

        const planName = member.plans.plan_name || 'Unknown Plan';
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      }
    });

    const averageRevenuePerActiveMember = activeMemberCount > 0 ? totalValueOfActivePlans / activeMemberCount : 0;

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
        totalValueOfActivePlans: Math.round(totalValueOfActivePlans),
        currentMonthlyRevenue: Math.round(currentMonthlyRevenueSum), // Now uses the sum of full plan prices
        averageRevenuePerActiveMember: parseFloat(averageRevenuePerActiveMember.toFixed(2)),
        topPerformingPlanName: topPerformingPlanName,
        activeMemberCount,
      },
    };

  } catch (e: any) {
    
    return { error: `Calculation error: ${e.message}` };
  }
}

