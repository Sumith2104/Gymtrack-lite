
import * as z from 'zod';
import type { MembershipType } from '@/lib/types';
import { MOCK_MEMBERSHIP_PLANS } from '@/lib/constants';

// Define the custom validation logic as a separate function
const isValidMembershipType = (val: any): val is MembershipType => {
  // Ensure val is a string before using it in .some() comparison,
  // and that it's one of the MOCK_MEMBERSHIP_PLANS names.
  if (typeof val !== 'string') return false;
  return MOCK_MEMBERSHIP_PLANS.some(p => p.name === val);
};

// Schema for validating new member form data (used on client and server)
// MemberID and JoinDate are removed as they are now server-generated.
export const addMemberFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  phoneNumber: z.string().optional().nullable(),
  age: z.coerce.number().int().positive().optional().nullable(),
  membershipType: z.custom<MembershipType>(isValidMembershipType, {
    message: "Invalid membership type. Please select a valid plan.",
  }),
});

export type AddMemberFormValues = z.infer<typeof addMemberFormSchema>;
    