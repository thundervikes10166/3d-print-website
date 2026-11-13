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

function firebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured in Netlify.');
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
  return { auth: getAuth(), db: getFirestore() };
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
    return json(500, { error: 'Photo uploads are not configured on the server yet. Ask an admin to check Netlify settings.' });
  }

  let user;
  try { user = await services.auth.verifyIdToken(bearer[1], true); }
  catch { return json(401, { error: 'Your sign-in expired. Sign in again and retry.' }); }

  try {
    if (!(await canPublishListings(services.db, user.uid))) {
      return json(403, { error: 'Only approved class students and administrators can upload product photos.' });
    }

    const data = await req.arrayBuffer();
    if (!data.byteLength) return json(400, { error: 'The photo file is empty.' });
    if (data.byteLength > MAX_BYTES) return json(413, { error: 'The photo is too large. Please choose a smaller image.' });
    if (detectImageType(new Uint8Array(data)) !== contentType) {
      return json(400, { error: 'This file is not a valid JPG, PNG, or WebP image.' });
    }

    const key = `${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
    // Strong consistency so the photo is viewable immediately after saving.
    const store = getStore({ name: STORE_NAME, consistency: 'strong' });
    await store.set(key, data, {
      metadata: { contentType, uploadedBy: user.uid, uploadedAt: new Date().toISOString() },
    });
    return json(201, { url: `/.netlify/functions/listing-image?key=${key}`, key });
  } catch (error) {
    console.error('listing-image-upload:', error);
    return json(500, { error: 'The photo could not be saved. Please try again.' });
  }
};
