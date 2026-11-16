// Permanently deletes a custom 3D print (CAD) request: the request record,
// its private staff notes, and (when possible) its uploaded reference photo.
// Admins only. Runs on the server so it does not depend on which Firestore
// rules are currently published, and leaves a small audit record.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

const describe = (error) => String([error?.code, error?.message].filter(Boolean).join(': ') || error)
  .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[key]')
  .slice(0, 300);

function firebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not available to Netlify Functions.');
  const account = JSON.parse(raw);
  if (!getApps().length) initializeApp({ credential: cert(account) });
  return { auth: getAuth(), db: getFirestore() };
}

// Best effort: a leftover photo is harmless, so never block the deletion on it.
async function deleteReferencePhoto(storagePath) {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (!storagePath || !bucketName || !storagePath.startsWith('cad-request-images/')) return false;
  try {
    const { getStorage } = await import('firebase-admin/storage');
    await getStorage().bucket(bucketName).file(storagePath).delete({ ignoreNotFound: true });
    return true;
  } catch (error) {
    console.warn('delete-request photo cleanup skipped:', describe(error));
    return false;
  }
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST required.' });
  const bearer = (req.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!bearer) return json(401, { error: 'Sign in before deleting requests.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }
  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) return json(400, { error: 'Invalid request ID.' });

  let services;
  try { services = firebase(); } catch (error) {
    console.error('delete-request config:', describe(error));
    return json(500, { error: `Server setup problem: ${describe(error)}` });
  }

  let user;
  try { user = await services.auth.verifyIdToken(bearer[1], true); }
  catch { return json(401, { error: 'Your sign-in could not be verified. Sign out, sign in again and retry.' }); }

  try {
    const { db } = services;
    const profile = await db.collection('users').doc(user.uid).get();
    if (!profile.exists || profile.data().role !== 'admin') {
      return json(403, { error: 'Only administrators can delete requests.' });
    }

    const ref = db.collection('requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return json(404, { error: 'This request was already deleted.' });
    const data = snap.data();

    // Audit trail first, so there is always a record of who deleted what.
    await db.collection('deleted_requests').doc(requestId).set({
      requestId,
      ticketNumber: data.ticketNumber || '',
      itemTitle: data.itemTitle || '',
      requesterId: data.requesterId || '',
      requesterDisplayName: data.requesterDisplayName || '',
      statusAtDeletion: data.status || '',
      deletedByUid: user.uid,
      deletedByEmail: user.email || '',
      deletedAt: FieldValue.serverTimestamp(),
    });
    // Removes the request AND its staffNotes subcollection.
    await db.recursiveDelete(ref);
    const photoDeleted = await deleteReferencePhoto(data.referenceImageStoragePath);

    return json(200, {
      message: `Request ${data.ticketNumber || requestId} was permanently deleted.`,
      photoDeleted,
    });
  } catch (error) {
    console.error('delete-request:', error);
    return json(500, { error: `The request could not be deleted: ${describe(error)}` });
  }
};
