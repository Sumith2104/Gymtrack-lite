
'use server';

import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email-service';
import { z } from 'zod';
import { APP_NAME } from '@/lib/constants';

const NewGymRequestSchema = z.object({
  gymName: z.string().min(2, 'Gym name must be at least 2 characters.'),
  ownerName: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().min(10, 'Please enter a valid phone number.'),
  email: z.string().email('Please enter a valid email address.'),
  city: z.string().min(2, 'City must be at least 2 characters.'),
});

export type NewGymRequestValues = z.infer<typeof NewGymRequestSchema>;

interface SendRequestResponse {
  success: boolean;
  error?: string;
}

export async function sendNewGymRequestEmailAction(formData: NewGymRequestValues): Promise<SendRequestResponse> {
  const validationResult = NewGymRequestSchema.safeParse(formData);
  if (!validationResult.success) {
    return { success: false, error: 'Validation failed. Please check your inputs.' };
  }

  const { gymName, ownerName, phone, email, city } = validationResult.data;

  const supabase = createSupabaseServiceRoleClient();

  try {
    // 1. Insert the request into the database
    const { error: insertError } = await supabase
      .from('gym_requests')
      .insert({
        gym_name: gymName,
        owner_name: ownerName,
        email: email,
        phone: phone,
        city: city,
        status: 'pending',
      });
    
    if (insertError) {
        console.error('Error inserting gym request:', insertError.message);
        return { success: false, error: 'Could not save your request in the database. Please try again.' };
    }


    // 2. Fetch the super admin's email to notify them
    const { data: superAdmin, error: adminError } = await supabase
      .from('super_admins')
      .select('email')
      .limit(1)
      .single();

    if (adminError || !superAdmin?.email) {
      console.error('Super admin email fetch error:', adminError?.message || 'No super admin email found');
      // The request is in the DB, so don't fail the whole operation. The admin can see it in their dashboard.
    } else {
        const superAdminEmail = superAdmin.email;

        const emailSubject = `New Gym Request Submitted via ${APP_NAME}`;
        const emailHtmlBody = `
        <p>A new request to create a gym has been submitted and logged in the system.</p>
        <p>You can review and approve it from the Super Admin dashboard.</p>
        <br>
        <p><strong>Request Details:</strong></p>
        <ul>
            <li><strong>Gym Name:</strong> ${gymName}</li>
            <li><strong>Owner's Name:</strong> ${ownerName}</li>
            <li><strong>Owner's Email:</strong> ${email}</li>
            <li><strong>Owner's Phone:</strong> ${phone}</li>
            <li><strong>City:</strong> ${city}</li>
        </ul>
        `;

        // Sending email to super admin, using default (super admin's) SMTP settings
        await sendEmail({
        to: superAdminEmail,
        subject: emailSubject,
        htmlBody: emailHtmlBody,
        gymDatabaseId: null, // This ensures default SMTP is used
        });
    }


    // 3. Send a confirmation email to the user who made the request.
    const userConfirmationSubject = `Your ${APP_NAME} Request Has Been Received`;
    const userConfirmationHtmlBody = `
      <p>Hi ${ownerName},</p>
      <p>Thank you for your interest in ${APP_NAME}. We have received and logged your request to create a new gym account for "${gymName}".</p>
      <p>Our team will review your information and get in touch with you soon to discuss the next steps.</p>
      <p>We're excited about the possibility of you joining our platform!</p>
      <br>
      <p>Best regards,<br/>The ${APP_NAME} Team</p>
    `;

    // Send confirmation email to the user, also using default SMTP settings
    const userEmailResult = await sendEmail({
      to: email, // The user's email
      subject: userConfirmationSubject,
      htmlBody: userConfirmationHtmlBody,
      gymDatabaseId: null, // Use default/super admin SMTP
    });

    if (!userEmailResult.success) {
      // Log the error but don't fail the entire operation, as the primary request to admin succeeded.
      console.warn(`[sendNewGymRequestEmailAction] Failed to send confirmation email to ${email}: ${userEmailResult.message}`);
    }

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error('Error in sendNewGymRequestEmailAction:', errorMessage);
    return { success: false, error: 'An unexpected server error occurred.' };
  }
}
