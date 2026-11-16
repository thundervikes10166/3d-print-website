// Sends automatic customer emails:
//   type "confirmation": right after a custom 3D print request is submitted
//                        (shop purchases are confirmed by submit-shop-estimate).
//   type "ready":        when staff move an order/request to "Ready for pickup".
// Each email is sent at most once per record (tracked on the record itself).
'use strict';
// CommonJS (classic handler) on purpose: Netlify's bundler then reliably
// includes ../lib/*.cjs and nodemailer, and it loads on every Node version.
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const mailer = require('../lib/mailer.cjs');
const templates = require('../lib/customerEmails.cjs');

const COLLECTION = { order: 'orders', request: 'requests' };
const SENT_FIELD = { confirmation: 'confirmationEmailSentAt', ready: 'readyEmailSentAt' };

const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(data),
});

function firebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not available to Netlify Functions.');
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
  return { auth: getAuth(), db: getFirestore() };
}

// Same rule as firestore.rules operator(): admin/teacher, or approved class student.
async function isStaff(db, uid) {
  const [profile, student] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('class_students').doc(uid).get(),
  ]);
  if (profile.exists && ['admin', 'teacher', 'teacher_admin'].includes(profile.data().role)) return true;
  return student.exists && student.data().approved === true && student.data().canPublish === true;
}

const validEmail = (value) => typeof value === 'string' && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(value.trim());

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST required.' });
  const bearer = String(event.headers.authorization || event.headers.Authorization || '').match(/^Bearer\s+(\S+)$/i);
  if (!bearer) return json(401, { error: 'Sign in required.' });

  let body;
  if (!event.body || event.body.length > 2000) return json(400, { error: 'Invalid request.' });
  try { body = JSON.parse(event.body); } catch { return json(400, { error: 'Invalid request.' }); }
  const { kind, type } = body || {};
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!COLLECTION[kind] || !SENT_FIELD[type] || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return json(400, { error: 'Invalid email request.' });
  }

  let services;
  try { services = firebase(); } catch (error) {
    console.error('customer-email config:', error.message);
    return json(500, { error: `Server setup problem: ${error.message}` });
  }
  let user;
  try { user = await services.auth.verifyIdToken(bearer[1], true); }
  catch { return json(401, { error: 'Your sign-in could not be verified. Sign in again.' }); }

  try {
    const ref = services.db.collection(COLLECTION[kind]).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return json(404, { error: 'Record not found.' });
    const record = snap.data();
    const ownerId = kind === 'order' ? record.buyerId : record.requesterId;

    if (type === 'confirmation') {
      // The customer who submitted it (or staff) may trigger the confirmation.
      if (ownerId !== user.uid && !(await isStaff(services.db, user.uid))) return json(403, { error: 'Not allowed.' });
    } else {
      if (!(await isStaff(services.db, user.uid))) return json(403, { error: 'Only staff can send pickup notices.' });
      if (record.status !== 'ready') return json(409, { error: 'The record is not marked "Ready for pickup".' });
    }

    if (record[SENT_FIELD[type]]) return json(200, { sent: false, reason: 'already-sent' });
    const to = String(record.contactEmail || '').trim();
    if (!validEmail(to)) return json(200, { sent: false, reason: 'no-email' });
    if (!mailer.emailProvider()) return json(200, { sent: false, reason: 'not-configured' });

    const message = type === 'confirmation'
      ? templates.confirmationEmail(kind, record, id)
      : templates.readyEmail(kind, record, id);
    try {
      await mailer.sendEmail({ to, ...message });
    } catch (error) {
      console.error('customer-email send:', error.message);
      return json(200, { sent: false, reason: 'send-failed', error: error.message });
    }
    await ref.update({ [SENT_FIELD[type]]: FieldValue.serverTimestamp(), [`${SENT_FIELD[type]}To`]: to });
    return json(200, { sent: true, to });
  } catch (error) {
    console.error('customer-email:', error);
    return json(500, { error: `Could not send the email: ${String(error?.message || error).slice(0, 200)}` });
  }
};
