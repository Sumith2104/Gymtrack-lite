
import * as z from 'zod';

// Schema for validating new member form data (used on client and server)
// MemberID and JoinDate are removed as they are server-generated.
// membershipType is replaced by selectedPlanUuid
export const addMemberFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  phoneNumber: z.string().optional().nullable(),
  age: z.coerce.number().int().positive().optional().nullable(),
  selectedPlanUuid: z.string().uuid({ message: "Please select a valid membership plan." }),
});

export type AddMemberFormValues = z.infer<typeof addMemberFormSchema>;
    
