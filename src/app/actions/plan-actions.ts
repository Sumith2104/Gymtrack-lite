'use server';

import type { FetchedMembershipPlan } from '@/lib/types';
import { addPlanFormSchema, type AddPlanFormValues } from '@/lib/schemas/plan-schemas';
import { ZodError } from 'zod';
import { flux } from '@/lib/flux/client';
import { v4 as uuidv4 } from 'uuid';

interface GetActiveMembershipPlansResponse {
  data?: FetchedMembershipPlan[];
  error?: string;
}

export async function getActiveMembershipPlans(gymDatabaseId: string | null): Promise<GetActiveMembershipPlansResponse> {
  if (!gymDatabaseId) {
    return { error: 'Gym ID not provided. Cannot fetch plans.' };
  }

  try {
    const query = `
      SELECT id, plan_id, plan_name, price, duration_months 
      FROM plans 
      WHERE gym_id = '${gymDatabaseId}' 
      AND is_active = true 
      ORDER BY price ASC
    `;
    const result = await flux.sql(query);

    if (!result.rows) {
      return { data: [] };
    }

    const fetchedPlans: FetchedMembershipPlan[] = result.rows.map((plan: any) => ({
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

  try {
    const validationResult = addPlanFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const zodError = validationResult.error as ZodError;
      return { error: "Validation failed", fieldErrors: zodError.flatten().fieldErrors };
    }

    const { planIdText, name, price, durationMonths } = validationResult.data;

    // Check existing
    const checkQuery = `
      SELECT id 
      FROM plans 
      WHERE plan_id = '${planIdText}' 
      AND gym_id = '${gymDatabaseId}' 
    `;
    const checkResult = await flux.sql(checkQuery);

    if (checkResult.rows && checkResult.rows.length > 0) {
      return { error: `Plan ID '${planIdText}' already exists for this gym. Please choose a unique Plan ID.` };
    }

    const newPlanId = uuidv4();
    const safeName = name.replace(/'/g, "''");

    const insertQuery = `
      INSERT INTO plans (
        id, 
        gym_id, 
        plan_id, 
        plan_name, 
        price, 
        duration_months, 
        is_active
      ) VALUES (
        '${newPlanId}', 
        '${gymDatabaseId}', 
        '${planIdText}', 
        '${safeName}', 
        ${price}, 
        ${durationMonths}, 
        true
      )
    `;

    await flux.sql(insertQuery);

    const newPlanAppFormat: FetchedMembershipPlan = {
      uuid: newPlanId,
      planIdText: planIdText,
      name: name,
      price: price,
      durationMonths: durationMonths,
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

  try {
    const validationResult = addPlanFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const zodError = validationResult.error as ZodError;
      return { error: "Validation failed", fieldErrors: zodError.flatten().fieldErrors };
    }

    const { planIdText, name, price, durationMonths } = validationResult.data;

    // Check if the new planIdText is already taken by another plan in the same gym
    if (planIdText) {
      const checkQuery = `
        SELECT id 
        FROM plans 
        WHERE plan_id = '${planIdText}' 
        AND gym_id = '${gymDatabaseId}' 
        AND id != '${planUuid}'
      `;
      const checkResult = await flux.sql(checkQuery);

      if (checkResult.rows && checkResult.rows.length > 0) {
        return { error: `Plan ID '${planIdText}' already exists for another plan in this gym.` };
      }
    }

    const safeName = name.replace(/'/g, "''");

    const updateQuery = `
      UPDATE plans 
      SET 
        plan_id = '${planIdText}',
        plan_name = '${safeName}',
        price = ${price},
        duration_months = ${durationMonths}
      WHERE id = '${planUuid}' 
      AND gym_id = '${gymDatabaseId}'
    `;

    await flux.sql(updateQuery);

    const updatedPlanAppFormat: FetchedMembershipPlan = {
      uuid: planUuid,
      planIdText: planIdText,
      name: name,
      price: price,
      durationMonths: durationMonths,
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

  try {
    const updateQuery = `
      UPDATE plans 
      SET is_active = false 
      WHERE id = '${planUuid}' 
      AND gym_id = '${gymDatabaseId}'
    `;
    await flux.sql(updateQuery);

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: `Error in softDeletePlanAction: ${errorMessage}` };
  }
}
