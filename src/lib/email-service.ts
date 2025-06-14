
'use server';

import nodemailer from 'nodemailer';
import { APP_NAME } from '@/lib/constants';
import { formatDateIST } from '@/lib/date-utils'; // Updated import

interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
}

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || `"${APP_NAME}" <noreply@example.com>`;
// const APP_URL = process.env.APP_URL || 'http://localhost:3000'; // For logo or links if needed - currently unused

const transporter = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

function getBaseEmailHtml(content: string, subject: string): string {
  // Basic styling, can be enhanced with more CSS.
  // Ensure APP_NAME is dynamic if it can change or is user-configurable.
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

export async function sendEmail({ to, subject, htmlBody }: EmailOptions): Promise<{ success: boolean; message: string }> {
  if (!transporter) {
    console.log('-------------------- EMAIL SIMULATION --------------------');
    console.log(`To: ${to}`);
    console.log(`From: ${SMTP_FROM_EMAIL}`);
    console.log(`Subject: ${subject}`);
    console.log('--- HTML Body (raw) ---');
    console.log(htmlBody); // Log raw body before wrapping in template for direct inspection
    console.log('--- HTML Body (templated) ---');
    console.log(getBaseEmailHtml(htmlBody, subject));
    console.log('------------------ END EMAIL SIMULATION ------------------');
    return { success: true, message: 'Email logged to console (SMTP not configured).' };
  }

  const mailOptions = {
    from: SMTP_FROM_EMAIL,
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
