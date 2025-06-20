
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
      .eq('gym_id', gymDatabaseId) 
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

    const { data: existingPlan, error: fetchError } = await supabase
        .from('plans')
        .select('id')
        .eq('plan_id', planIdText)
        .eq('gym_id', gymDatabaseId) 
        .maybeSingle();

    if (fetchError) {
        return { error: `DB error checking for existing plan ID: ${fetchError.message}` };
    }
    if (existingPlan) {
        return { error: `Plan ID '${planIdText}' already exists for this gym. Please choose a unique Plan ID.` };
    }

    const newPlanForDb = {
      gym_id: gymDatabaseId, 
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

interface UpdatePlanResponse {
  data?: FetchedMembershipPlan;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function updatePlanAction(
  planUuid: string,
  formData: AddPlanFormValues,
  gymDatabaseId: string | null
): Promise<UpdatePlanResponse> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided. Cannot update plan.' };
  }
  if (!planUuid) {
    return { error: 'Plan UUID not provided. Cannot update plan.' };
  }

  const supabase = createSupabaseServerActionClient();
  try {
    const validationResult = addPlanFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const zodError = validationResult.error as ZodError;
      return { error: "Validation failed", fieldErrors: zodError.flatten().fieldErrors };
    }

    const { planIdText, name, price, durationMonths } = validationResult.data;

    // Check if the new planIdText is already taken by another plan in the same gym
    if (planIdText) {
      const { data: conflictingPlan, error: fetchError } = await supabase
        .from('plans')
        .select('id')
        .eq('plan_id', planIdText)
        .eq('gym_id', gymDatabaseId)
        .neq('id', planUuid) // Exclude the current plan being edited
        .maybeSingle();

      if (fetchError) {
        return { error: `DB error checking for conflicting plan ID: ${fetchError.message}` };
      }
      if (conflictingPlan) {
        return { error: `Plan ID '${planIdText}' already exists for another plan in this gym.` };
      }
    }

    const planUpdateForDb = {
      plan_id: planIdText,
      plan_name: name,
      price: price,
      duration_months: durationMonths,
      // is_active is not changed here, only through softDelete
    };

    const { data: updatedPlanData, error: updateError } = await supabase
      .from('plans')
      .update(planUpdateForDb)
      .eq('id', planUuid)
      .eq('gym_id', gymDatabaseId) // Ensure we only update the plan for the correct gym
      .select('id, plan_id, plan_name, price, duration_months')
      .single();

    if (updateError || !updatedPlanData) {
      return { error: `Failed to update plan: ${updateError?.message || "Unknown DB error or plan not found."}` };
    }

    const updatedPlanAppFormat: FetchedMembershipPlan = {
      uuid: updatedPlanData.id,
      planIdText: updatedPlanData.plan_id,
      name: updatedPlanData.plan_name,
      price: updatedPlanData.price,
      durationMonths: updatedPlanData.duration_months,
    };

    return { data: updatedPlanAppFormat };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `Error in updatePlanAction: ${errorMessage}` };
  }
}

interface SoftDeletePlanResponse {
  success: boolean;
  error?: string;
}

export async function softDeletePlanAction(planUuid: string, gymDatabaseId: string | null): Promise<SoftDeletePlanResponse> {
  if (!gymDatabaseId) {
    return { success: false, error: 'Gym ID not provided. Cannot delete plan.' };
  }
  if (!planUuid) {
    return { success: false, error: 'Plan UUID not provided. Cannot delete plan.' };
  }

  const supabase = createSupabaseServerActionClient();
  try {
    const { error } = await supabase
      .from('plans')
      .update({ is_active: false })
      .eq('id', planUuid)
      .eq('gym_id', gymDatabaseId);

    if (error) {
      return { success: false, error: `Failed to mark plan as inactive: ${error.message}` };
    }

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: `Error in softDeletePlanAction: ${errorMessage}` };
  }
}
