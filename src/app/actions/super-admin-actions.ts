'use server';

import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email-service';
import { z } from 'zod';
import { APP_NAME } from '@/lib/constants';

const NewGymRequestSchema = z.object({
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

  const { ownerName, phone, email, city } = validationResult.data;

  const supabase = createSupabaseServiceRoleClient();

  try {
    // Fetch the first super admin's email
    const { data: superAdmin, error: adminError } = await supabase
      .from('super_admins')
      .select('email')
      .limit(1)
      .single();

    if (adminError || !superAdmin?.email) {
      console.error('Super admin email fetch error:', adminError?.message || 'No super admin email found');
      return { success: false, error: 'Could not find a recipient for the request. Please contact support directly.' };
    }

    const superAdminEmail = superAdmin.email;

    const emailSubject = `New Gym Creation Request via ${APP_NAME}`;
    const emailHtmlBody = `
      <p>A new request to create a gym has been submitted.</p>
      <p>Here are the details:</p>
      <ul>
        <li><strong>Owner's Name:</strong> ${ownerName}</li>
        <li><strong>Owner's Email:</strong> ${email}</li>
        <li><strong>Owner's Phone:</strong> ${phone}</li>
        <li><strong>City:</strong> ${city}</li>
      </ul>
      <p>Please review this request and contact the user to proceed with the gym setup process.</p>
    `;

    // Sending email to super admin, using default (super admin's) SMTP settings
    const emailResult = await sendEmail({
      to: superAdminEmail,
      subject: emailSubject,
      htmlBody: emailHtmlBody,
      gymDatabaseId: null, // This ensures default SMTP is used
    });

    if (!emailResult.success) {
      return { success: false, error: `Failed to send request email: ${emailResult.message}` };
    }

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error('Error in sendNewGymRequestEmailAction:', errorMessage);
    return { success: false, error: 'An unexpected server error occurred.' };
  }
}
