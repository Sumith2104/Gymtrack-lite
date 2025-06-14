
'use server';

import { addMonths, format } from 'date-fns';
import type { Member, MembershipType, Announcement, MembershipPlan } from '@/lib/types';
import { MOCK_MEMBERSHIP_PLANS, APP_NAME } from '@/lib/constants';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';


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
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      let errorMessages = [];
      if (fieldErrors.name) errorMessages.push(`Name: ${fieldErrors.name.join(', ')}`);
      if (fieldErrors.email) errorMessages.push(`Email: ${fieldErrors.email.join(', ')}`);
      if (fieldErrors.membershipType) errorMessages.push(`Membership Type: ${fieldErrors.membershipType.join(', ')}`);
      if (fieldErrors.age) errorMessages.push(`Age: ${fieldErrors.age.join(', ')}`);
      
      return { error: `Validation failed: ${errorMessages.join('; ') || 'Check inputs.'}` };
    }

    const { name, email, phoneNumber, age, membershipType } = validationResult.data;

    // 2. Calculate Derived Information
    // The 'membershipType' from the form is the plan's name (e.g., "Monthly", "Premium", "Annual")
    const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === membershipType);
    if (!selectedPlan) {
      return { error: `Invalid membership type selected: '${membershipType}'. Plan details not found.` };
    }

    const planPrice = selectedPlan.price;
    const joinDate = new Date(); // Join date is always today
    const expiryDate = selectedPlan.durationMonths > 0 
      ? addMonths(joinDate, selectedPlan.durationMonths) 
      : null;

    // 3. Generate Member ID (Server-side)
    // For simulation: Gym prefix + timestamp-based suffix. Ensure uniqueness in a real DB.
    const memberIdSuffix = Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 4).toUpperCase();
    const memberId = `${gymName.substring(0, 3).toUpperCase()}${memberIdSuffix}`.substring(0, 10);

    console.log(`SIMULATING: Check if Member ID "${memberId}" for gym "${gymDatabaseId}" is unique.`);

    // 4. Prepare New Member Object
    const newMember: Member = {
      id: `member_serveraction_${Date.now()}`, 
      gymId: gymDatabaseId,
      name,
      email: email || null,
      memberId, // Server-generated
      membershipStatus: 'active', 
      phoneNumber: phoneNumber || null,
      age: age || null,
      joinDate: joinDate.toISOString(), // Server-set
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

interface EditMemberServerResponse {
  data?: {
    updatedMember: Member;
    message: string;
  };
  error?: string;
}

// The AddMemberFormValues can be reused for edit if the fields are largely the same.
// However, memberId is not in AddMemberFormValues, so we take it separately.
export async function editMember(
  memberData: Partial<Omit<Member, 'id' | 'gymId' | 'memberId'>> & { membershipType?: MembershipType }, // Use form values type
  memberOriginalId: string, // The true UUID of the member
  gymDatabaseId: string
): Promise<EditMemberServerResponse> {
    try {
        console.log("SIMULATING: Edit member server action for memberId (UUID):", memberOriginalId, "in gymId:", gymDatabaseId, "with data:", memberData);

        // In a real app, fetch existing member by memberOriginalId & gymDatabaseId
        // const existingMember = await supabase.from('members').select().eq('id', memberOriginalId).eq('gym_id', gymDatabaseId).single();
        // if (existingMember.error || !existingMember.data) return { error: "Member not found or access denied."};
        // For simulation, we assume we have the member data or it's passed in (partially)
        
        // Create a base for the updated member using existing data (simulated)
        const placeholderExistingMember: Member = {
            id: memberOriginalId,
            gymId: gymDatabaseId,
            memberId: `EDIT${Date.now().toString().slice(-4)}`, // Placeholder if not editable
            name: "Original Name",
            email: "original@example.com",
            membershipStatus: 'active',
            createdAt: new Date(Date.now() - 100000000).toISOString(),
            joinDate: new Date(Date.now() - 100000000).toISOString(),
            membershipType: 'Monthly', // Original type
            planPrice: 30,
            expiryDate: addMonths(new Date(Date.now() - 100000000), 1).toISOString(),
            planId: MOCK_MEMBERSHIP_PLANS.find(p => p.name === 'Monthly')?.id || 'plan_monthly_basic',
        };

        const updatedMemberData: Partial<Member> = { ...memberData };
        
        // If membershipType is part of memberData and has changed, recalculate plan dependent fields
        if (memberData.membershipType && memberData.membershipType !== placeholderExistingMember.membershipType) {
            const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === memberData.membershipType);
            if (selectedPlan) {
                updatedMemberData.planPrice = selectedPlan.price;
                updatedMemberData.planId = selectedPlan.id;
                const joinDateForCalc = placeholderExistingMember.joinDate ? new Date(placeholderExistingMember.joinDate) : new Date();
                updatedMemberData.expiryDate = selectedPlan.durationMonths > 0
                    ? addMonths(joinDateForCalc, selectedPlan.durationMonths).toISOString()
                    : null;
            } else {
                 return { error: `Invalid new membership type: ${memberData.membershipType}` };
            }
        }

        const finalUpdatedMember: Member = {
            ...placeholderExistingMember, // Base with original non-editable fields like ID, gymId, original memberId
            ...updatedMemberData,         // Apply changes from form
             // Ensure required fields have defaults if not provided by spread (though schema should enforce)
            name: updatedMemberData.name || placeholderExistingMember.name,
            membershipStatus: updatedMemberData.membershipStatus || placeholderExistingMember.membershipStatus,
        };


        console.log("SIMULATING: Member data updated:", finalUpdatedMember);
        // In real app: await supabase.from('members').update(finalUpdatedMemberDatabaseReady).eq('id', memberOriginalId);

        return { data: { updatedMember: finalUpdatedMember, message: "Member details updated (Simulated)." } };

    } catch (error) {
        console.error('Error in editMember server action:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { error: `An unexpected error occurred while editing the member: ${errorMessage}` };
    }
}
    