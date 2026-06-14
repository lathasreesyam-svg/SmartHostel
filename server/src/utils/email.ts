import nodemailer from 'nodemailer';
import env from '../config/env';
import { logger } from './logger';

// ── Transporter (SendGrid SMTP or any SMTP) ──────────────────────────────────
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false, // STARTTLS
  auth: {
    user: env.SMTP_USER, // 'apikey' for SendGrid
    pass: env.SMTP_PASS, // SendGrid API Key
  },
});

// ── Generic send helper ───────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.SMTP_PASS || !env.SMTP_PASS.trim()) {
    // Email not configured — log OTP to console so devs can see it
    logger.info(`📧 [DEV MODE - No SMTP configured] To: ${to} | Subject: ${subject}`);
    // Extract plain text from HTML for easy log reading
    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    logger.info(`   Content preview: ${plainText}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"SmartHostel" <${env.FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    logger.info(`📧 Email sent to ${to} — ${subject}`);
  } catch (error) {
    logger.error(`📧 Email send failed to ${to}:`, error);
    throw new Error('Failed to send email. Please try again later.');
  }
}

// ── Email Templates ───────────────────────────────────────────────────────────

const baseStyle = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  max-width: 520px;
  margin: 0 auto;
  background: #f8fafc;
  padding: 32px 16px;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 16px;
  padding: 36px 32px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(15,42,69,0.08);
`;

const btnStyle = `
  display: inline-block;
  background: linear-gradient(135deg, #2b7fc4, #1a5a9e);
  color: #ffffff;
  text-decoration: none;
  padding: 14px 28px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 15px;
  margin: 20px 0;
`;

const logoHtml = `
  <div style="text-align:center; margin-bottom:28px;">
    <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#2b7fc4,#1a5a9e);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
      <span style="color:#fff;font-size:26px;">🏠</span>
    </div>
    <h2 style="margin:0;color:#0f2a45;font-size:22px;font-weight:800;">SmartHostel</h2>
    <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Hostel Management System</p>
  </div>
`;

// ── 1. Email Verification ─────────────────────────────────────────────────────
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${env.APP_URL}/auth/verify-email?token=${token}`;

  const html = `
  <div style="${baseStyle}">
    <div style="${cardStyle}">
      ${logoHtml}
      <h3 style="color:#0f2a45;font-size:20px;font-weight:700;margin:0 0 12px;">
        Verify your email address
      </h3>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
        Hi <strong>${name}</strong>, welcome to SmartHostel! 
        Please click the button below to verify your email address and activate your account.
      </p>
      <div style="text-align:center;">
        <a href="${verifyUrl}" style="${btnStyle}">✅ Verify Email</a>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;text-align:center;">
        This link expires in <strong>24 hours</strong>. If you didn't create an account, ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
        Or copy this link: <code style="word-break:break-all;color:#2b7fc4;">${verifyUrl}</code>
      </p>
    </div>
  </div>`;

  await sendEmail(to, '✅ Verify your SmartHostel email', html);
}

// ── 2. Forgot Password / Reset ────────────────────────────────────────────────
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const resetUrl = `${env.APP_URL}/auth/reset-password?token=${token}`;

  const html = `
  <div style="${baseStyle}">
    <div style="${cardStyle}">
      ${logoHtml}
      <h3 style="color:#0f2a45;font-size:20px;font-weight:700;margin:0 0 12px;">
        Reset your password
      </h3>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
        Hi <strong>${name || to}</strong>, we received a request to reset your SmartHostel password.
        Click the button below to create a new password.
      </p>
      <div style="text-align:center;">
        <a href="${resetUrl}" style="${btnStyle}">🔑 Reset Password</a>
      </div>
      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:14px 16px;margin:20px 0;">
        <p style="color:#92400e;margin:0;font-size:13px;">
          ⚠️ This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email — your password will not change.
        </p>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
        Or copy this link: <code style="word-break:break-all;color:#2b7fc4;">${resetUrl}</code>
      </p>
    </div>
  </div>`;

  await sendEmail(to, '🔑 Reset your SmartHostel password', html);
}

// ── 3. OTP Verification Email ────────────────────────────────────────────────
export async function sendOtpEmail(
  to: string,
  name: string,
  otp: string,
): Promise<void> {
  const digits = otp.split('').map(
    (d) => `<span style="display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;font-size:26px;font-weight:800;color:#0f2a45;background:#f1f5f9;border:2px solid #cbd5e1;border-radius:10px;margin:0 4px;">${d}</span>`
  ).join('');

  const html = `
  <div style="${baseStyle}">
    <div style="${cardStyle}">
      ${logoHtml}
      <h3 style="color:#0f2a45;font-size:20px;font-weight:700;margin:0 0 12px;">
        Verify your email address
      </h3>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
        Hi <strong>${name}</strong>, thanks for registering with SmartHostel!
        Enter the 6-digit code below to verify your email address.
      </p>
      <div style="text-align:center;margin:28px 0;">
        ${digits}
      </div>
      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:14px 16px;margin:20px 0;">
        <p style="color:#92400e;margin:0;font-size:13px;">
          ⏱️ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;text-align:center;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  </div>`;

  await sendEmail(to, '🔐 Your SmartHostel verification code', html);
}

// ── 4. Notification emails (rebate status, complaint update, etc.) ────────────
export async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
): Promise<void> {
  const html = `
  <div style="${baseStyle}">
    <div style="${cardStyle}">
      ${logoHtml}
      <h3 style="color:#0f2a45;font-size:20px;font-weight:700;margin:0 0 12px;">${title}</h3>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">${message}</p>
      <div style="text-align:center;">
        <a href="${env.APP_URL}" style="${btnStyle}">Open SmartHostel</a>
      </div>
    </div>
  </div>`;

  await sendEmail(to, `🔔 ${title}`, html);
}
