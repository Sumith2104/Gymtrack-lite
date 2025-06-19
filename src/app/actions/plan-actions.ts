
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { FetchedMembershipPlan, MembershipType } from '@/lib/types';

interface GetActiveMembershipPlansResponse {
  data?: FetchedMembershipPlan[];
  error?: string;
}

export async function getActiveMembershipPlans(): Promise<GetActiveMembershipPlansResponse> {
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: plansData, error } = await supabase
      .from('plans')
      .select('id, plan_id, plan_name, price, duration_months')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      
      return { error: `Database error: ${error.message}` };
    }

    if (!plansData) {
      return { data: [] };
    }
    
    const fetchedPlans: FetchedMembershipPlan[] = plansData.map(plan => ({
      uuid: plan.id, 
      planIdText: plan.plan_id, 
      name: plan.plan_name as MembershipType, 
      price: plan.price,
      durationMonths: plan.duration_months,
    }));

    return { data: fetchedPlans };

  } catch (e: any) {
    
    return { error: `Unexpected error fetching plans: ${e.message}` };
  }
}
