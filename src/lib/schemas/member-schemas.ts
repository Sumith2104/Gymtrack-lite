
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
export const addMemberFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  memberId: z.string().min(3, { message: 'Member ID must be at least 3 characters.' }).max(20),
  // membershipStatus is defaulted to 'active' on server, not part of form directly for new add
  phoneNumber: z.string().optional().nullable(),
  age: z.coerce.number().int().positive().optional().nullable(),
  joinDate: z.date({ required_error: "Join date is required."}), // Will be converted to string later
  membershipType: z.custom<MembershipType>(isValidMembershipType, { 
    message: "Invalid membership type. Please select a valid plan.",
  }),
  // planPrice and expiryDate are calculated on server
});

export type AddMemberFormValues = z.infer<typeof addMemberFormSchema>;
    