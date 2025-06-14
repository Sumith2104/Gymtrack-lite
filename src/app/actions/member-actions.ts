
'use server';

import * as z from 'zod';
import { addMonths, format } from 'date-fns';
import type { Member, MembershipType, Announcement, MembershipPlan } from '@/lib/types';
import { MOCK_MEMBERSHIP_PLANS, APP_NAME } from '@/lib/constants';

// Schema for validating new member form data (used on client and server)
export const addMemberFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  memberId: z.string().min(3, { message: 'Member ID must be at least 3 characters.' }).max(20),
  // membershipStatus is defaulted to 'active' on server, not part of form directly for new add
  phoneNumber: z.string().optional().nullable(),
  age: z.coerce.number().int().positive().optional().nullable(),
  joinDate: z.date({ required_error: "Join date is required."}), // Will be converted to string later
  membershipType: z.custom<MembershipType>((val) => MOCK_MEMBERSHIP_PLANS.some(p => p.name === val), {
    message: "Invalid membership type",
  }),
  // planPrice and expiryDate are calculated on server
});

export type AddMemberFormValues = z.infer<typeof addMemberFormSchema>;

interface AddMemberServerResponse {
  data?: {
    newMember: Member;
    welcomeAnnouncement: Announcement;
    emailStatus: string;
  };
  error?: string;
}

export async function addMember(
  formData: AddMemberFormValues,
  gymDatabaseId: string,
  gymName: string
): Promise<AddMemberServerResponse> {
  try {
    // 1. Server-side validation
    const validationResult = addMemberFormSchema.safeParse(formData);
    if (!validationResult.success) {
      console.error("Server-side validation failed:", validationResult.error.flatten().fieldErrors);
      return { error: `Validation failed: ${validationResult.error.flatten().fieldErrors.name?.[0] || 'Check inputs.'}` };
    }

    const { name, email, memberId, phoneNumber, age, joinDate, membershipType } = validationResult.data;

    // 2. Calculate Derived Information
    const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === membershipType);
    if (!selectedPlan) {
      return { error: 'Invalid membership type selected.' };
    }

    const planPrice = selectedPlan.price;
    const expiryDate = selectedPlan.durationMonths > 0 
      ? addMonths(new Date(joinDate), selectedPlan.durationMonths) 
      : null;

    // 3. Simulate Checking for Existing Member ID (Placeholder for actual DB query)
    // In a real app: await supabase.from('members').select('id').eq('member_id', memberId).eq('gym_id', gymDatabaseId).maybeSingle();
    // For simulation, we'll assume it's unique if it passes client-side suggestion.
    console.log(`SIMULATING: Check if Member ID "${memberId}" for gym "${gymDatabaseId}" is unique.`);

    // 4. Prepare New Member Object (Simulate Database Insertion)
    const newMember: Member = {
      id: `member_serveraction_${Date.now()}`, // Simulate DB-generated UUID
      gymId: gymDatabaseId,
      name,
      email: email || null,
      memberId,
      membershipStatus: 'active', // Default for new members
      phoneNumber: phoneNumber || null,
      age: age || null,
      joinDate: new Date(joinDate).toISOString(),
      membershipType,
      planPrice,
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      createdAt: new Date().toISOString(),
      planId: selectedPlan.id, // Store the planId used
    };

    console.log('SIMULATING: Member data prepared for "insertion":', newMember);

    // 5. Post-Insertion Actions

    // 5a. Simulate Send Welcome Email
    let emailStatus = 'No email address provided.';
    if (newMember.email) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(newMember.memberId)}`;
      console.log(`SIMULATING: Sending Welcome Email to: ${newMember.email}`);
      console.log(`  Subject: Welcome to ${gymName}!`);
      console.log(`  Body: Hello ${newMember.name},\n\nWelcome to ${gymName}! We're thrilled to have you.\n
        Your Membership Details:
        Member ID: ${newMember.memberId}
        Join Date: ${format(new Date(newMember.joinDate!), 'PP')}
        Membership Type: ${newMember.membershipType}
        Plan Price: $${newMember.planPrice?.toFixed(2)}
        Expires: ${newMember.expiryDate ? format(new Date(newMember.expiryDate), 'PP') : 'N/A'}
        \nUse this QR code for easy check-ins: ${qrCodeUrl}\n\n
        Best regards,\nThe ${gymName} Team`);
      emailStatus = `Welcome email simulation for ${newMember.email} initiated.`;
    }

    // 5b. Create Welcome Announcement Data
    const welcomeAnnouncement: Announcement = {
      id: `announce_welcome_${newMember.id}`,
      gymId: gymDatabaseId,
      title: `Welcome New Member: ${newMember.name}!`,
      content: `Let's all give a warm welcome to ${newMember.name} (ID: ${newMember.memberId}), who joined us on ${format(new Date(newMember.joinDate!), 'PP')} with a ${newMember.membershipType || 'new'} membership! We're excited to have them in the ${gymName} community.`,
      createdAt: new Date().toISOString(),
    };
    console.log('SIMULATING: Welcome announcement created:', welcomeAnnouncement);

    // 6. Return Success
    return {
      data: {
        newMember,
        welcomeAnnouncement,
        emailStatus,
      },
    };

  } catch (error) {
    console.error('Error in addMember server action:', error);
    return { error: 'An unexpected error occurred while adding the member.' };
  }
}

// Placeholder for editMember server action if needed later
export async function editMember(memberData: Partial<Member>, memberId: string, gymId: string) {
  // TODO: Implement server-side validation, calculation, and update logic
  console.log("SIMULATING: editMember server action for memberId:", memberId, "in gymId:", gymId, "with data:", memberData);
  // This would involve fetching the existing member, applying changes, recalculating price/expiry if type changes,
  // and then updating the record in the database.
  // For now, this function is a placeholder.
  return { error: "Edit functionality not fully implemented on server yet." };
}
