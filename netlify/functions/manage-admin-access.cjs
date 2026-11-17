'use strict';

// Netlify-only administrator invitation and revocation endpoint.
// A normal user cannot promote themselves: every invitation/revocation
// requires a verified Firebase ID token belonging to a current Firestore admin.
// Accepting an invitation also requires the invited user's Firebase sign-in
// AND possession of the single-use token delivered to that email address.
const crypto = require('node:crypto');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const mailer = require('../lib/mailer.cjs');

const OWNER_EMAIL = 'jonathan.soto@oxnardunion.org';
const LIFE_MS = 72 * 60 * 60 * 1000;
const normalize = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const isEmail = (value) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(value) && value.length <= 254;
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const reply = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(data),
});

function firebase() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured in Netlify.');
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  return { auth: getAuth(), db: getFirestore() };
}

async function verifyCaller(auth, event) {
  const bearer = String(event.headers.authorization || event.headers.Authorization || '').match(/^Bearer\s+(\S+)$/i);
  if (!bearer) return null;
  try { return await auth.verifyIdToken(bearer[1], true); } catch { return null; }
}

async function isAdmin(db, user) {
  if (!user?.uid) return false;
  const profile = await db.collection('users').doc(user.uid).get();
  return profile.exists && profile.data().role === 'admin';
}

function siteUrl() {
  const configuredUrl = process.env.URL || 'https://thunder-vikes-orders.netlify.app';
  if (!/^https:\/\//i.test(configuredUrl)) throw new Error('Netlify URL must use HTTPS.');
  return configuredUrl.replace(/\/$/, '');
}

async function sendAdminGrantedNotice(to, url) {
  await mailer.sendEmail({
    to,
    subject: 'You are now an administrator of the Thunder Vikes store',
    text: [
      'You have been made an administrator of the Thunder Vikes Robotics Store.',
      '',
      `Sign in at ${url} with this email address. The Manage menu now appears for you.`,
      '',
      'If you were not expecting this, contact thundervikes10166@gmail.com.',
      'Thunder Vikes Robotics · Hueneme High School · Room Q10',
    ].join('\n'),
  });
}

async function sendInvitation(to, inviteUrl) {
  if (!mailer.emailProvider()) {
    throw new Error('Email is not set up yet. Add RESEND_API_KEY and NOTIFICATION_FROM_EMAIL in Netlify (or the Gmail settings), then redeploy.');
  }
  await mailer.sendEmail({
    to,
    subject: 'Invitation to manage the Thunder Vikes store',
    text: [
      'You have been invited to be an administrator of the Thunder Vikes Robotics Store.',
      '',
      'Open this private invitation link:',
      inviteUrl,
      '',
      'Sign in with the same email address, or register and choose your own password if you do not yet have an account.',
      'Then select Activate Admin Access. The invitation expires after 72 hours.',
      '',
      'If you were not expecting this invitation, ignore it.',
      'Thunder Vikes Robotics · Hueneme High School · Room Q10',
    ].join('\n'),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST required.' });
  if (!event.body || event.body.length > 5000) return reply(400, { error: 'Invalid request.' });
  let body;
  try { body = JSON.parse(event.body); } catch { return reply(400, { error: 'Invalid JSON.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Invalid request body.' });

  try {
    const { auth, db } = firebase();
    const user = await verifyCaller(auth, event);
    if (!user) return reply(401, { error: 'Sign in again before managing admin access.' });
    const action = body.action;

    if (action === 'accept') {
      // An invitation can be redeemed only by the signed-in account matching
      // the recipient email AND the unguessable token sent to their inbox.
      const email = normalize(user.email);
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      if (!isEmail(email) || !/^[a-f\d]{64}$/.test(token)) return reply(400, { error: 'Invalid invitation link or login.' });
      const inviteRef = db.collection('admin_invitations').doc(hash(email));
      const profileRef = db.collection('users').doc(user.uid);
      const whitelistRef = db.collection('admin_whitelist').doc(hash(email));
      await db.runTransaction(async (tx) => {
        const invitation = await tx.get(inviteRef);
        const data = invitation.data();
        if (!invitation.exists || data?.email !== email || data?.tokenHash !== hash(token) || data?.status !== 'pending' || typeof data?.expiresAt !== 'number' || data.expiresAt <= Date.now()) {
          throw Object.assign(new Error('Invitation is expired, already used, or does not match this account.'), { statusCode: 403 });
        }
        const existing = await tx.get(profileRef);
        // Do not overwrite other user profile fields.
        tx.set(profileRef, {
          uid: user.uid, email, role: 'admin',
          ...(existing.exists ? {} : { displayName: user.name || email.split('@')[0], createdAt: FieldValue.serverTimestamp() }),
        }, { merge: true });
        tx.update(inviteRef, { status: 'accepted', acceptedByUid: user.uid, acceptedAt: FieldValue.serverTimestamp(), tokenHash: FieldValue.delete() });
        tx.set(whitelistRef, { email, uid: user.uid, status: 'active', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      });
      return reply(200, { message: 'Admin access activated. Your account permissions are updated.' });
    }

    if (!(await isAdmin(db, user))) return reply(403, { error: 'Only existing administrators can invite or remove administrators.' });

    if (action === 'invite') {
      // Adding an admin NEVER depends on email. Email is only a courtesy.
      const email = normalize(body.email);
      if (!isEmail(email)) return reply(400, { error: 'Enter a valid email address.' });
      if (email === normalize(user.email)) return reply(400, { error: 'Your account is already an administrator.' });
      const key = hash(email);
      const inviteRef = db.collection('admin_invitations').doc(key);
      const whitelistRef = db.collection('admin_whitelist').doc(key);

      // 1) They already have an account on the site: make them an admin right now.
      let target = null;
      try { target = await auth.getUserByEmail(email); }
      catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
      if (target) {
        const profileRef = db.collection('users').doc(target.uid);
        const profile = await profileRef.get();
        if (profile.exists && profile.data().role === 'admin') {
          await whitelistRef.set({ email, uid: target.uid, status: 'active', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          return reply(200, { granted: true, message: `${email} is already an administrator.` });
        }
        await profileRef.set({
          uid: target.uid, email, role: 'admin', updatedAt: FieldValue.serverTimestamp(),
          ...(profile.exists ? {} : { displayName: target.displayName || email.split('@')[0], createdAt: FieldValue.serverTimestamp() }),
        }, { merge: true });
        await whitelistRef.set({ email, uid: target.uid, status: 'active', grantedByUid: user.uid, grantedAt: FieldValue.serverTimestamp() }, { merge: true });
        await inviteRef.delete().catch(() => {});
        let emailed = false;
        if (mailer.emailProvider()) {
          try { await sendAdminGrantedNotice(email, siteUrl()); emailed = true; }
          catch (error) { console.warn('Admin granted notice not emailed:', error.message); }
        }
        return reply(200, {
          granted: true,
          message: `${email} is now an administrator. They will see the Manage tools the next time they open or refresh the site.${emailed ? ' We also emailed them.' : ''}`,
        });
      }

      // 2) No account yet: create a one-time invitation link that YOU can share,
      //    and also email it when email is set up. They register, then activate.
      const token = crypto.randomBytes(32).toString('hex');
      const inviteUrl = `${siteUrl()}/#admin-invite?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
      // A role is never granted at the invite stage. This only stores a pending token.
      await inviteRef.set({ email, tokenHash: hash(token), status: 'pending', invitedByUid: user.uid, invitedByEmail: normalize(user.email), invitedAt: FieldValue.serverTimestamp(), expiresAt: Date.now() + LIFE_MS });
      await whitelistRef.set({ email, status: 'invited', invitedAt: FieldValue.serverTimestamp(), invitedByUid: user.uid }, { merge: true });
      let emailed = false;
      let emailProblem = '';
      if (mailer.emailProvider()) {
        try { await sendInvitation(email, inviteUrl); emailed = true; }
        catch (error) { emailProblem = error.message; console.warn('Admin invitation not emailed:', error.message); }
      }
      return reply(200, {
        granted: false,
        inviteUrl,
        emailed,
        message: emailed
          ? `${email} does not have an account yet. We emailed them an invitation link (also shown below). They create an account with that email, then select Activate Admin Access.`
          : `${email} does not have an account yet. Copy the invitation link below and send it to them (text, chat, or email). They create an account with that email, then select Activate Admin Access.${emailProblem ? ` (Automatic email failed: ${emailProblem})` : ''}`,
      });
    }

    if (action === 'revoke') {
      const email = normalize(body.email);
      if (!isEmail(email)) return reply(400, { error: 'Enter a valid email address.' });
      if (email === OWNER_EMAIL) return reply(403, { error: 'The primary owner account is protected.' });
      if (email === normalize(user.email)) return reply(403, { error: 'You cannot remove your own admin access.' });
      let removedRole = false;
      try {
        const target = await auth.getUserByEmail(email);
        const profileRef = db.collection('users').doc(target.uid);
        const profile = await profileRef.get();
        if (profile.exists && profile.data().role === 'admin') {
          await profileRef.update({ role: 'student', updatedAt: FieldValue.serverTimestamp() });
          removedRole = true;
        }
      } catch (error) {
        if (error?.code !== 'auth/user-not-found') throw error;
      }
      await db.collection('admin_invitations').doc(hash(email)).delete().catch(() => {});
      const matching = await db.collection('admin_whitelist').where('email', '==', email).get();
      const batch = db.batch();
      matching.docs.forEach((item) => batch.delete(item.ref));
      if (!matching.empty) await batch.commit();
      return reply(200, { message: removedRole ? `${email} is no longer an administrator.` : `Pending invitation or allowlist entry for ${email} removed.` });
    }

    return reply(400, { error: 'Unknown action.' });
  } catch (error) {
    console.error('manage-admin-access:', error);
    return reply(error?.statusCode || 500, { error: error?.message || 'Could not update administrator access.' });
  }
};
