
import * as z from 'zod';

// Schema for validating new member form data (used on client and server)
export const addMemberFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100),
  email: z.string().email({ message: 'Invalid email address.' }),
  phoneNumber: z.string().min(1, { message: 'Phone number is required.' }),
  age: z.coerce.number().int().positive({ message: 'Age must be a positive number.' }),
  selectedPlanUuid: z.string().uuid({ message: "Please select a valid membership plan." }),
});

export type AddMemberFormValues = z.infer<typeof addMemberFormSchema>;
    
