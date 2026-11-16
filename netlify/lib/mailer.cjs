'use strict';

// Shared email sender for Netlify Functions (CommonJS so every function,
// .cjs or .mjs, can load it on any Node version Netlify uses).
//
// Configure ONE of these in Netlify > Environment variables (Functions scope).
// If both are set, Resend is used.
//   A) Resend (preferred; free tier). To email customers, the sender address
//      must be on a domain verified in Resend:
//        RESEND_API_KEY + NOTIFICATION_FROM_EMAIL
//   B) Gmail / any SMTP account (no domain needed):
//        GMAIL_USER + GMAIL_APP_PASSWORD          (Gmail shortcut), or
//        SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (any provider)
// Optional: EMAIL_FROM_NAME (default "Thunder Vikes Robotics"),
//           EMAIL_REPLY_TO (default the team Gmail).
const nodemailer = require('nodemailer');

const TEAM_EMAIL = 'thundervikes10166@gmail.com';
const fromName = () => process.env.EMAIL_FROM_NAME || 'Thunder Vikes Robotics';
const replyTo = () => process.env.EMAIL_REPLY_TO || TEAM_EMAIL;

function smtpSettings() {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    return {
      host: process.env.SMTP_HOST, port, secure: port === 465,
      user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    };
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return {
      host: 'smtp.gmail.com', port: 465, secure: true,
      user: process.env.GMAIL_USER.trim(),
      pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ''), // Google shows it with spaces
      from: process.env.GMAIL_USER.trim(),
    };
  }
  return null;
}

/** Which provider is configured, or null when email is not set up yet. */
const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL);

function emailProvider() {
  if (resendConfigured()) return 'resend';
  if (smtpSettings()) return 'smtp';
  return null;
}

/** Sends one email. Throws with a readable message on failure. */
async function sendEmail({ to, subject, text, html }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) throw new Error('No recipient email address.');
  const smtp = resendConfigured() ? null : smtpSettings();
  if (smtp) {
    const transport = nodemailer.createTransport({
      host: smtp.host, port: smtp.port, secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      // Stay well inside Netlify's 10-second function limit.
      connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 5000,
    });
    try {
      await transport.sendMail({ from: { name: fromName(), address: smtp.from }, to: recipients, replyTo: replyTo(), subject, text, html });
    } catch (error) {
      const hint = /535|Invalid login|Username and Password not accepted/i.test(String(error?.message))
        ? ' (the email account or app password was rejected)' : '';
      throw new Error(`Email could not be sent${hint}: ${String(error?.message || error).slice(0, 200)}`);
    }
    return { provider: 'smtp' };
  }
  if (process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL) {
    const from = process.env.NOTIFICATION_FROM_EMAIL.includes('<')
      ? process.env.NOTIFICATION_FROM_EMAIL : `${fromName()} <${process.env.NOTIFICATION_FROM_EMAIL}>`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: recipients, reply_to: replyTo(), subject, text, html }),
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const hint = /verify a domain|testing emails|own email address/i.test(detail)
        ? ' Resend can only email customers after you verify your domain in Resend and use an address on it in NOTIFICATION_FROM_EMAIL.' : '';
      throw new Error(`Resend rejected the email (HTTP ${response.status}).${hint} ${detail.slice(0, 200)}`);
    }
    return { provider: 'resend' };
  }
  throw new Error('Email is not set up yet (add RESEND_API_KEY and NOTIFICATION_FROM_EMAIL in Netlify).');
}

module.exports = { TEAM_EMAIL, emailProvider, sendEmail };
