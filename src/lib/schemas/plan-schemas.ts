
import * as z from 'zod';

export const addPlanFormSchema = z.object({
  planIdText: z.string()
    .min(3, "Plan ID must be at least 3 characters.")
    .max(20, "Plan ID must be at most 20 characters.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Plan ID can only contain letters, numbers, underscores, and hyphens.")
    .trim(),
  name: z.string()
    .min(3, "Plan name must be at least 3 characters.")
    .max(50, "Plan name must be at most 50 characters.")
    .trim(),
  price: z.coerce.number()
    .positive("Price must be a positive number.")
    .min(0.01, "Price must be at least 0.01.")
    .max(1000000, "Price seems too high."), // Max price limit
  durationMonths: z.coerce.number()
    .int("Duration must be a whole number of months.")
    .positive("Duration must be positive.")
    .min(1, "Duration must be at least 1 month.")
    .max(120, "Duration cannot exceed 10 years (120 months)."), // Max duration limit
});

export type AddPlanFormValues = z.infer<typeof addPlanFormSchema>;
