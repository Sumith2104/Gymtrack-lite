
'use server';

import * as z from 'zod';
import { addMonths, format } from 'date-fns';
import type { Member, MembershipType, Announcement, MembershipPlan } from '@/lib/types';
import { MOCK_MEMBERSHIP_PLANS, APP_NAME } from '@/lib/constants';

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
  membershipType: z.custom<MembershipType>(isValidMembershipType, { // Use the named function here
    message: "Invalid membership type. Please select a valid plan.",
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
      // Construct a more specific error message
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      let errorMessages = [];
      if (fieldErrors.name) errorMessages.push(`Name: ${fieldErrors.name[0]}`);
      if (fieldErrors.email) errorMessages.push(`Email: ${fieldErrors.email[0]}`);
      if (fieldErrors.memberId) errorMessages.push(`Member ID: ${fieldErrors.memberId[0]}`);
      if (fieldErrors.joinDate) errorMessages.push(`Join Date: ${fieldErrors.joinDate[0]}`);
      if (fieldErrors.membershipType) errorMessages.push(`Membership Type: ${fieldErrors.membershipType[0]}`);
      if (fieldErrors.age) errorMessages.push(`Age: ${fieldErrors.age[0]}`);
      
      return { error: `Validation failed: ${errorMessages.join(', ') || 'Check inputs.'}` };
    }

    const { name, email, memberId, phoneNumber, age, joinDate, membershipType } = validationResult.data;

    // 2. Calculate Derived Information
    const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === membershipType);
    if (!selectedPlan) {
      // This case should ideally be caught by the custom validator, but double-check
      return { error: 'Invalid membership type selected on server.' };
    }

    const planPrice = selectedPlan.price;
    const expiryDate = selectedPlan.durationMonths > 0 
      ? addMonths(new Date(joinDate), selectedPlan.durationMonths) 
      : null;

    // 3. Simulate Checking for Existing Member ID (Placeholder for actual DB query)
    console.log(`SIMULATING: Check if Member ID "${memberId}" for gym "${gymDatabaseId}" is unique.`);

    // 4. Prepare New Member Object (Simulate Database Insertion)
    const newMember: Member = {
      id: `member_serveraction_${Date.now()}`, 
      gymId: gymDatabaseId,
      name,
      email: email || null,
      memberId,
      membershipStatus: 'active', 
      phoneNumber: phoneNumber || null,
      age: age || null,
      joinDate: new Date(joinDate).toISOString(),
      membershipType,
      planPrice,
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      createdAt: new Date().toISOString(),
      planId: selectedPlan.id, 
    };

    console.log('SIMULATING: Member data prepared for "insertion":', newMember);

    // 5. Post-Insertion Actions
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

    const welcomeAnnouncement: Announcement = {
      id: `announce_welcome_${newMember.id}`,
      gymId: gymDatabaseId,
      title: `Welcome New Member: ${newMember.name}!`,
      content: `Let's all give a warm welcome to ${newMember.name} (ID: ${newMember.memberId}), who joined us on ${format(new Date(newMember.joinDate!), 'PP')} with a ${newMember.membershipType || 'new'} membership! We're excited to have them in the ${gymName} community.`,
      createdAt: new Date().toISOString(),
    };
    console.log('SIMULATING: Welcome announcement created:', welcomeAnnouncement);

    return {
      data: {
        newMember,
        welcomeAnnouncement,
        emailStatus,
      },
    };

  } catch (error) {
    console.error('Error in addMember server action:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: `An unexpected error occurred while adding the member: ${errorMessage}` };
  }
}

export async function editMember(memberData: Partial<Member>, memberId: string, gymId: string) {
  console.log("SIMULATING: editMember server action for memberId:", memberId, "in gymId:", gymId, "with data:", memberData);
  // In a real app, you would:
  // 1. Validate memberData (perhaps with a different Zod schema for edits)
  // 2. Fetch the existing member from the database.
  // 3. Apply changes.
  // 4. If membershipType or joinDate changed, recalculate planPrice and expiryDate.
  // 5. Update the member record in the database.
  // 6. Return the updated member data or an error.
  
  // For simulation, we'll just return a success-like structure if it's a basic update
  // or an error if not fully implemented.
  // This part is NOT fully implemented as per the problem description.
  
  if (memberData.name || memberData.email || memberData.phoneNumber || memberData.age) {
      // Simulate a partial update was successful
      const simulatedUpdatedMember: Member = {
        id: memberId, // Use the provided memberId
        gymId: gymId, // Use the provided gymId
        name: memberData.name || "Original Name",
        email: memberData.email || "original@example.com",
        memberId: memberId, // Assuming memberId itself doesn't change or is the key
        membershipStatus: memberData.membershipStatus || 'active',
        phoneNumber: memberData.phoneNumber || null,
        age: memberData.age || null,
        joinDate: memberData.joinDate || new Date().toISOString(),
        membershipType: memberData.membershipType || 'Monthly',
        planPrice: memberData.planPrice || 30,
        expiryDate: memberData.expiryDate || addMonths(new Date(), 1).toISOString(),
        createdAt: new Date().toISOString(), // Or fetch original
         planId: MOCK_MEMBERSHIP_PLANS.find(p => p.name === (memberData.membershipType || 'Monthly'))?.id || 'plan_monthly_basic'
      };
       return { data: { updatedMember: simulatedUpdatedMember, message: "Member details partially updated (Simulated)." } };
  }

  return { error: "Edit functionality (especially plan changes) not fully implemented on server yet." };
}
    