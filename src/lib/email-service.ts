
'use server';

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { APP_NAME } from '@/lib/constants';
import { createSupabaseServiceRoleClient } from './supabase/server';
import type { EmailOptions } from './types';


// Fallback transporter using environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const envVarTransporter = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, 
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;
const envVarFromEmail = process.env.SMTP_FROM_EMAIL || `"${APP_NAME}" <noreply@example.com>`;


// New function to get the super admin transporter from DB
async function getSuperAdminTransporter(): Promise<{transporter: Transporter; fromEmail: string} | null> {
    try {
        const supabase = createSupabaseServiceRoleClient();
        
        const { data: superAdminSmtp, error: adminSmtpError } = await supabase
            .from('super_admins')
            .select('smtp_host, smtp_port, smtp_username, smtp_pass, smtp_from')
            .limit(1)
            .single();
        
        if (adminSmtpError || !superAdminSmtp || !superAdminSmtp.smtp_host || !superAdminSmtp.smtp_port || !superAdminSmtp.smtp_username || !superAdminSmtp.smtp_pass) {
            return null; // No super admin SMTP configured or incomplete config.
        }

        const port = parseInt(superAdminSmtp.smtp_port, 10);
        const superAdminTransporter = nodemailer.createTransport({
            host: superAdminSmtp.smtp_host,
            port: port,
            secure: port === 465,
            auth: {
                user: superAdminSmtp.smtp_username,
                pass: superAdminSmtp.smtp_pass,
            },
        });

        const superAdminFromEmail = superAdminSmtp.smtp_from || superAdminSmtp.smtp_username;
        return { transporter: superAdminTransporter, fromEmail: superAdminFromEmail };
        
    } catch (e) {
        console.error(`[Email Service] Could not get Super Admin SMTP config from DB.`, e);
        return null;
    }
}


// Function to get a transporter, either gym-specific or default
async function getTransporter(gymDatabaseId?: string | null): Promise<{transporter: Transporter | null, fromEmail: string}> {
    
    // Default settings are now fetched from DB first, then .env
    const superAdminSettings = await getSuperAdminTransporter();
    const defaultTransporter = superAdminSettings?.transporter || envVarTransporter;
    const defaultFromEmail = superAdminSettings?.fromEmail || envVarFromEmail;

    if (!gymDatabaseId) {
        // If no gymId is specified, we MUST use the default (super admin DB config or .env fallback)
        return { transporter: defaultTransporter, fromEmail: defaultFromEmail };
    }

    // If a gymId IS provided, try to use its specific settings
    try {
        const supabase = createSupabaseServiceRoleClient();
        const { data: gymSmtp, error } = await supabase
            .from('gyms')
            .select('app_host, port, app_email, app_pass, from_email')
            .eq('id', gymDatabaseId)
            .single();

        // If gym-specific settings are incomplete, fall back to the defaults
        if (error || !gymSmtp || !gymSmtp.app_host || !gymSmtp.port || !gymSmtp.app_email || !gymSmtp.app_pass) {
            return { transporter: defaultTransporter, fromEmail: defaultFromEmail };
        }
        
        const port = parseInt(gymSmtp.port, 10);
        const gymTransporter = nodemailer.createTransport({
            host: gymSmtp.app_host,
            port: port,
            secure: port === 465,
            auth: {
                user: gymSmtp.app_email,
                pass: gymSmtp.app_pass,
            },
        });

        const gymFromEmail = gymSmtp.from_email || gymSmtp.app_email;

        return { transporter: gymTransporter, fromEmail: gymFromEmail };

    } catch (e) {
        console.error(`[Email Service] Error fetching SMTP config for gym ${gymDatabaseId}, falling back to default.`, e);
        return { transporter: defaultTransporter, fromEmail: defaultFromEmail };
    }
}


function getBaseEmailHtml(content: string, subject: string): string {
  const currentYear = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background-color: #080808; color: #e0e0e0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #1a1a1a; border: 1px solid #333; border-radius: 8px; overflow: hidden; }
        .header { background-color: #0D0D0D; padding: 20px; text-align: center; border-bottom: 1px solid #333;}
        .header h1 { color: #FFD700; margin: 0; font-size: 24px; }
        .content { padding: 20px; line-height: 1.6; color: #cccccc; }
        .content h2 { color: #FFD700; margin-top:0; }
        .content ul { padding-left: 20px; }
        .content li { margin-bottom: 5px; }
        .footer { background-color: #0D0D0D; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #333; }
        .button { display: inline-block; padding: 10px 20px; margin-top: 15px; background-color: #FFD700; color: #080808; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .qr-code { margin-top: 15px; text-align: center; }
        .qr-code img { max-width: 150px; border: 3px solid #FFD700; border-radius: 4px; }
        .announcement-content { padding: 10px; border-left: 3px solid #FFD700; margin: 10px 0; background-color: #222; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${APP_NAME}</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${currentYear} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendEmail({ to, subject, htmlBody, gymDatabaseId }: EmailOptions): Promise<{ success: boolean; message: string }> {
  const { transporter, fromEmail } = await getTransporter(gymDatabaseId);

  if (!transporter) {
    console.log(`[Email Service] SMTP not configured. Would send to ${to}: ${subject}`);
    return { success: true, message: 'Email logged to console (SMTP not configured).' };
  }

  const mailOptions = {
    from: fromEmail,
    to: to,
    subject: subject,
    html: getBaseEmailHtml(htmlBody, subject),
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: `Email successfully sent to ${to}.` };
  } catch (error: any) {
    console.error(`Error sending email to ${to}:`, error);
    return { success: false, message: `Failed to send email: ${error.message}` };
  }
}
