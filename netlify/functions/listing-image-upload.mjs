// Uploads a product photo for a store listing into Netlify Blobs.
// Works on any Firebase plan (no Firebase Storage / Blaze plan needed).
//
// Security: the caller must send a valid Firebase ID token AND be allowed to
// publish listings, using the same rule as firestore.rules `operator()`:
// admin/teacher role in users/{uid}, or an approved class_students/{uid}.
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const STORE_NAME = 'listing-images';
const MAX_BYTES = 4 * 1024 * 1024; // the browser resizes photos well below this first
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

// Error details shown to staff so problems can be fixed without server logs.
// Never includes secret values (private keys are stripped).
const describe = (error) => String([error?.code, error?.message].filter(Boolean).join(': ') || error)
  .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[key]')
  .slice(0, 300);

class SetupError extends Error {}

// Netlify stops functions after 10 seconds with an unexplained 502, so give
// each slow step its own limit and report which one did not answer.
const withTimeout = (promise, ms, what) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} did not respond within ${ms / 1000} seconds`)), ms)),
]);

function firebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) {
    throw new SetupError('The FIREBASE_SERVICE_ACCOUNT_JSON variable is not available to Netlify Functions. In Netlify: Site configuration > Environment variables, add it with the Functions scope, then redeploy.');
  }
  let account;
  try { account = JSON.parse(raw); } catch {
    throw new SetupError('FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. Paste the ENTIRE contents of the downloaded service-account .json file, starting with { and ending with }.');
  }
  for (const field of ['project_id', 'client_email', 'private_key']) {
    if (!account[field]) throw new SetupError(`FIREBASE_SERVICE_ACCOUNT_JSON is missing "${field}". Download a new key: Firebase Console > Project settings > Service accounts > Generate new private key.`);
  }
  if (!getApps().length) {
    try { initializeApp({ credential: cert(account) }); }
    catch (error) { throw new SetupError(`FIREBASE_SERVICE_ACCOUNT_JSON could not be used: ${describe(error)}`); }
  }
  return { auth: getAuth(), db: getFirestore(), projectId: account.project_id };
}

async function canPublishListings(db, uid) {
  const [profile, student] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('class_students').doc(uid).get(),
  ]);
  if (profile.exists && ['admin', 'teacher', 'teacher_admin'].includes(profile.data().role)) return true;
  return student.exists && student.data().approved === true && student.data().canPublish === true;
}

// Check the actual file bytes, not just the Content-Type header the client claims.
function detectImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST required.' });

  const bearer = (req.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!bearer) return json(401, { error: 'Sign in before uploading photos.' });

  const contentType = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!EXTENSIONS[contentType]) return json(415, { error: 'Only JPG, PNG, or WebP photos can be uploaded.' });
  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) {
    return json(413, { error: 'The photo is too large. Please choose a smaller image.' });
  }

  let services;
  try { services = firebase(); } catch (error) {
    console.error('listing-image-upload config:', error.message);
    return json(500, { error: `Photo upload setup problem (step 1 of 3): ${error instanceof SetupError ? error.message : describe(error)}` });
  }

  let user;
  try { user = await services.auth.verifyIdToken(bearer[1], true); }
  catch (error) {
    console.error('listing-image-upload verify:', describe(error));
    // A wrong project in the server key also lands here, so say what happened.
    const wrongProject = /aud|audience|project/i.test(String(error?.message));
    return json(401, { error: wrongProject
      ? `Sign-in could not be verified: the server key is for Firebase project "${services.projectId}", which does not match this website's project. Use a service-account key from the same Firebase project. (${describe(error)})`
      : `Your sign-in could not be verified. Sign out, sign in again and retry. (${describe(error)})` });
  }

  try {
    if (!(await withTimeout(canPublishListings(services.db, user.uid), 5000, 'Firebase Firestore'))) {
      return json(403, { error: 'Only approved class students and administrators can upload product photos.' });
    }
  } catch (error) {
    console.error('listing-image-upload firestore:', error);
    return json(500, { error: `Photo upload problem (step 2 of 3, checking your account in Firebase project "${services.projectId}"): ${describe(error)}` });
  }

  try {
    const data = await req.arrayBuffer();
    if (!data.byteLength) return json(400, { error: 'The photo file is empty.' });
    if (data.byteLength > MAX_BYTES) return json(413, { error: 'The photo is too large. Please choose a smaller image.' });
    if (detectImageType(new Uint8Array(data)) !== contentType) {
      return json(400, { error: 'This file is not a valid JPG, PNG, or WebP image.' });
    }

    const key = `${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
    // Strong consistency so the photo is viewable immediately after saving.
    const store = getStore({ name: STORE_NAME, consistency: 'strong' });
    await withTimeout(store.set(key, data, {
      metadata: { contentType, uploadedBy: user.uid, uploadedAt: new Date().toISOString() },
    }), 3500, 'Netlify Blobs storage');
    return json(201, { url: `/.netlify/functions/listing-image?key=${key}`, key });
  } catch (error) {
    console.error('listing-image-upload storage:', error);
    return json(500, { error: `Photo upload problem (step 3 of 3, saving to Netlify photo storage): ${describe(error)}` });
  }
};
