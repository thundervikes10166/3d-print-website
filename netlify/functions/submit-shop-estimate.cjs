'use strict';

// Netlify Function for PUBLIC shop quote requests, including visitors without accounts.
// Uses Firebase Admin on the server, so do NOT grant unauthenticated Firestore writes.
// No Firebase Blaze plan or Firebase Cloud Functions required.
const crypto = require('node:crypto');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const reply = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(data),
});

const str = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
const emailValid = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneValid = (value) => !value || /^\+?[\d\s().-]{7,24}$/.test(value) && (value.match(/\d/g) || []).length >= 7;

function firebaseServices() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
  return { db: getFirestore(), auth: getAuth() };
}

async function notifyAdmin(db, orderId, order) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!apiKey || !from) return;

  const recipients = new Set([
    'thundervikes10166@gmail.com',
    'jonathan.soto@oxnardunion.org',
  ]);
  try {
    const snapshot = await db.collection('admin_whitelist').get();
    for (const doc of snapshot.docs) {
      const address = str(doc.data().email, 254).toLowerCase();
      if (emailValid(address) && address) recipients.add(address);
    }
  } catch (error) {
    console.warn('Admin email lookup failed; using baseline recipients.', error.message);
  }

  const body = [
    'New Thunder Vikes shop estimate request',
    `Request: #${orderId.slice(0, 8).toUpperCase()}`,
    `Product: ${order.listingTitle}`,
    `Customer: ${order.buyerDisplayName}`,
    `Email: ${order.contactEmail || '(not provided)'}`,
    `Phone: ${order.contactPhone || '(not provided)'}`,
    `Preferred contact: ${order.preferredUpdateMethod}`,
    `Quantity: ${order.quantity}`,
    `Color: ${order.selectedColor}`,
    `Size: ${order.selectedSize || '(not applicable)'}`,
    `Material: ${order.selectedMaterial}`,
    `Notes: ${order.notes || '(none)'}`,
    '',
    'This is a REQUEST, not permission to start fulfillment. Contact the customer to confirm the estimate and order before preparation.',
    'Once complete and ready for pickup, direct them to Hueneme High School, Room Q10.',
  ].join('\n');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [...recipients], subject: `New shop estimate: ${order.listingTitle}`, text: body }),
  });
  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST is required.' });
  // Same-origin browser requests only. Does not replace throttling/antispam controls.
  const origin = event.headers.origin;
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host.split(',')[0].trim()) return reply(403, { error: 'Invalid request origin.' });
    } catch {
      return reply(403, { error: 'Invalid request origin.' });
    }
  }
  if (!event.body || event.body.length > 12000) return reply(413, { error: 'Request is too large.' });

  let data;
  try { data = JSON.parse(event.body); }
  catch { return reply(400, { error: 'Invalid form data.' }); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(400, { error: 'Invalid form data.' });
  if (str(data.website, 500)) return reply(400, { error: 'Could not submit the request.' }); // honeypot

  const listingId = str(data.listingId, 120);
  const firstName = str(data.firstName, 80);
  const lastName = str(data.lastName, 80);
  const contactEmail = str(data.contactEmail, 254).toLowerCase();
  const contactPhone = str(data.contactPhone, 30);
  const preferredUpdateMethod = str(data.preferredUpdateMethod, 10);
  const selectedColor = str(data.selectedColor, 80);
  const selectedSize = str(data.selectedSize, 40);
  const notes = str(data.notes, 1500);
  const quantity = data.quantity;

  if (!/^[\w-]{5,120}$/.test(listingId)) return reply(400, { error: 'Invalid product selection.' });
  if (!firstName || !lastName) return reply(400, { error: 'First and last names are required.' });
  if (!emailValid(contactEmail) || !phoneValid(contactPhone)) return reply(400, { error: 'Enter a valid email address or phone number.' });
  if (!contactEmail && !contactPhone) return reply(400, { error: 'Please provide an email address or phone number.' });
  if (!['email', 'phone'].includes(preferredUpdateMethod)) return reply(400, { error: 'Please choose your preferred contact method.' });
  if (preferredUpdateMethod === 'email' && !contactEmail) return reply(400, { error: 'An email address is required for email updates.' });
  if (preferredUpdateMethod === 'phone' && !contactPhone) return reply(400, { error: 'A phone number is required for phone updates.' });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 15) return reply(400, { error: 'Quantity must be between 1 and 15.' });

  try {
    const { db, auth } = firebaseServices();
    let buyerUid = null;
    const bearer = (event.headers.authorization || '').match(/^Bearer (\S+)$/i);
    if (bearer) {
      try { buyerUid = (await auth.verifyIdToken(bearer[1])).uid; }
      catch { buyerUid = null; } // A stale login never blocks submitting as a guest.
    }

    // Always load product details on the SERVER. Never trust a client-supplied price,
    // product name, seller ID, or published status.
    const listingSnap = await db.collection('listings').doc(listingId).get();
    if (!listingSnap.exists || listingSnap.data().status !== 'published') {
      return reply(404, { error: 'This item is no longer available for an estimate.' });
    }
    const listing = listingSnap.data();
    const allowedColors = listing.specs?.availableColors;
    const colors = Array.isArray(allowedColors) && allowedColors.length
      ? allowedColors : ['Signal Red', 'Stealth Black', 'White'];
    if (!colors.includes(selectedColor)) return reply(400, { error: 'Please select a valid color.' });
    const merchCategory = ['t-shirts', 'hats', 'hoodies', 'other merch', 'merch'].includes(String(listing.category || '').trim().toLowerCase());
    const sizes = Array.isArray(listing.merchSizes) ? listing.merchSizes : [];
    if (merchCategory && sizes.length && !sizes.includes(selectedSize)) return reply(400, { error: 'Please select an available size.' });

    // Per-IP throttle. The token is HMAC-hashed; raw IPs are never written to Firestore.
    // Netlify's own rate-limiting should also be enabled for stronger protection.
    const remoteIp = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';
    const accountSecret = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).private_key;
    const ipHash = crypto.createHmac('sha256', accountSecret).update(remoteIp).digest('hex');
    const rateRef = db.collection('guest_order_rate_limits').doc(ipHash);
    const orderRef = db.collection('orders').doc();
    const now = Date.now();
    const timestamp = new Date(now).toISOString();
    const guest = !buyerUid;
    const order = {
      buyerId: buyerUid || 'guest',
      buyerDisplayName: `${firstName} ${lastName}`,
      customerFirstName: firstName,
      customerLastName: lastName,
      contactEmail,
      contactPhone,
      preferredUpdateMethod,
      updatesActivated: false, // outreach is manual until email/phone integrations are enabled
      sellerId: listing.creatorId || listing.makerId || '',
      sellerDisplayName: listing.creatorDisplayName || listing.makerName || 'Student Maker',
      listingId,
      listingTitle: listing.title || listing.name || '3D printed item',
      listingImageUrl: listing.imageUrl || '',
      quantity,
      priceAtTimeOfOrder: Number(listing.price || listing.priceAmount || 0),
      selectedColor,
      selectedSize: merchCategory ? selectedSize : '',
      selectedMaterial: listing.material || 'PLA',
      notes,
      isQuoteRequest: true,
      guestCheckout: guest,
      pickupLocation: 'Hueneme High School, Room Q10',
      status: 'requested',
      statusLog: [{
        status: 'requested', timestamp,
        note: 'Estimate request submitted. Awaiting manual confirmation before printing.',
        changedByUid: buyerUid || 'guest', changedByName: `${firstName} ${lastName}`, changedByEmail: contactEmail,
      }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.runTransaction(async (transaction) => {
      const rate = await transaction.get(rateRef);
      const info = rate.exists ? rate.data() : {};
      const withinWindow = typeof info.windowStart === 'number' && (now - info.windowStart) < 3600000;
      const count = withinWindow ? info.count || 0 : 0;
      // A moderately high limit accounts for multiple students on one school network.
      if (count >= 30) throw Object.assign(new Error('Too many requests. Please try again later.'), { code: 'RATE_LIMIT' });
      transaction.set(rateRef, { windowStart: withinWindow ? info.windowStart : now, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
      transaction.create(orderRef, order);
    });

    // Never fail the customer's successfully-saved order because an email provider is offline.
    try { await notifyAdmin(db, orderRef.id, order); }
    catch (error) { console.error('Admin email notification failed:', error); }
    return reply(201, { orderId: orderRef.id });
  } catch (error) {
    if (error.code === 'RATE_LIMIT') return reply(429, { error: error.message });
    console.error('Public shop estimate submission error:', error);
    return reply(503, { error: 'We could not save your request right now. Please try again or contact thundervikes10166@gmail.com.' });
  }
};
