
'use server';

import nodemailer from 'nodemailer';
import { formatInTimeZone } from 'date-fns-tz';
import { APP_NAME } from '@/lib/constants';

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
const APP_URL = process.env.APP_URL || 'http://localhost:9002'; // For logo or links if needed

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
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .header { background-color: #080808; padding: 20px; text-align: center; }
        .header h1 { color: #FFD700; margin: 0; font-size: 24px; }
        .content { padding: 20px; line-height: 1.6; }
        .footer { background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; }
        .button { display: inline-block; padding: 10px 20px; margin-top: 15px; background-color: #FFD700; color: #080808; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .qr-code { margin-top: 15px; text-align: center; }
        .qr-code img { max-width: 150px; }
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
          <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
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
    console.log('--- HTML Body ---');
    console.log(htmlBody);
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

export function formatDateIST(date: Date | string | number, formatString: string = 'PPpp'): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return formatInTimeZone(dateObj, 'Asia/Kolkata', formatString);
  } catch (error) {
    console.error("Error formatting date for IST:", error);
    return "Invalid Date";
  }
}
