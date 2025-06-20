
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { FetchedMembershipPlan } from '@/lib/types';
import { addPlanFormSchema, type AddPlanFormValues } from '@/lib/schemas/plan-schemas';
import { ZodError } from 'zod';

interface GetActiveMembershipPlansResponse {
  data?: FetchedMembershipPlan[];
  error?: string;
}

export async function getActiveMembershipPlans(gymDatabaseId: string | null): Promise<GetActiveMembershipPlansResponse> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided. Cannot fetch plans.' };
  }
  const supabase = createSupabaseServerActionClient();
  try {
    const { data: plansData, error } = await supabase
      .from('plans')
      .select('id, plan_id, plan_name, price, duration_months')
      .eq('gym_id', gymDatabaseId) // Filter by gym_id
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
      name: plan.plan_name,
      price: plan.price,
      durationMonths: plan.duration_months,
    }));

    return { data: fetchedPlans };

  } catch (e: any) {
    return { error: `Unexpected error fetching plans: ${e.message}` };
  }
}

interface AddPlanResponse {
  data?: FetchedMembershipPlan;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function addPlanAction(formData: AddPlanFormValues, gymDatabaseId: string | null): Promise<AddPlanResponse> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided. Cannot create plan.' };
  }
  
  const supabase = createSupabaseServerActionClient();
  try {
    const validationResult = addPlanFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const zodError = validationResult.error as ZodError;
      return { error: "Validation failed", fieldErrors: zodError.flatten().fieldErrors };
    }
    
    const { planIdText, name, price, durationMonths } = validationResult.data;

    // Check if plan_id (textual one) already exists for this gym
    const { data: existingPlan, error: fetchError } = await supabase
        .from('plans')
        .select('id')
        .eq('plan_id', planIdText)
        .eq('gym_id', gymDatabaseId) // Scope check to current gym
        .maybeSingle();

    if (fetchError) {
        return { error: `DB error checking for existing plan ID: ${fetchError.message}` };
    }
    if (existingPlan) {
        return { error: `Plan ID '${planIdText}' already exists for this gym. Please choose a unique Plan ID.` };
    }

    const newPlanForDb = {
      gym_id: gymDatabaseId, // Associate plan with the gym
      plan_id: planIdText,
      plan_name: name,
      price: price,
      duration_months: durationMonths,
      is_active: true, 
    };

    const { data: insertedPlanData, error: insertError } = await supabase
      .from('plans')
      .insert(newPlanForDb)
      .select('id, plan_id, plan_name, price, duration_months')
      .single();

    if (insertError || !insertedPlanData) {
      return { error: `Failed to add plan to database: ${insertError?.message || "Unknown DB error."}`};
    }
    
    const newPlanAppFormat: FetchedMembershipPlan = {
        uuid: insertedPlanData.id,
        planIdText: insertedPlanData.plan_id,
        name: insertedPlanData.plan_name,
        price: insertedPlanData.price,
        durationMonths: insertedPlanData.duration_months,
    };

    return { data: newPlanAppFormat };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `Error in addPlanAction: ${errorMessage}` };
  }
}
