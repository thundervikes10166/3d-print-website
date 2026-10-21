"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyAdminsOfCustomRequest = exports.notifyAdminsOfOrder = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const firestore_2 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const resend_1 = require("resend");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const resendApiKey = (0, params_1.defineSecret)('RESEND_API_KEY');
const notificationFromEmail = (0, params_1.defineString)('NOTIFICATION_FROM_EMAIL');
const baselineAdminEmails = [
    'ckojwang1@oxnardunion.org',
    'kojwangpeter2@gmail.com',
];
const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
const getAdminEmails = async () => {
    const snapshot = await db.collection('admin_whitelist').get();
    return Array.from(new Set([...baselineAdminEmails, ...snapshot.docs.map((document) => document.data().email)]
        .map((email) => String(email || '').trim().toLowerCase())
        .filter((email) => email.includes('@'))));
};
const formatContact = (data) => {
    const email = String(data.contactEmail || '').trim();
    const phone = String(data.contactPhone || '').trim();
    const preferred = String(data.preferredUpdateMethod || '').trim();
    return [
        preferred ? `Preferred updates: ${preferred}` : '',
        email ? `Email: ${email}` : '',
        phone ? `Phone: ${phone}` : '',
    ]
        .filter(Boolean)
        .join(' | ');
};
const sendAdminNotification = async (kind, id, data) => {
    const recipients = await getAdminEmails();
    if (recipients.length === 0) {
        firebase_functions_1.logger.warn('No admin email recipients found in admin_whitelist.', { kind, id });
        return;
    }
    const title = String(data.listingTitle || data.itemTitle || 'Untitled request');
    const requester = String(data.buyerDisplayName || data.requesterDisplayName || 'Unknown requester');
    const contact = formatContact(data);
    const subject = `New ${kind.toLowerCase()} - ${title}`;
    const text = [
        `A new ${kind.toLowerCase()} was submitted to the Robotics Lab.`,
        '',
        `Title: ${title}`,
        `Requester: ${requester}`,
        contact,
        `Record ID: ${id}`,
        '',
        'Open the Robotics Lab website to review it.',
    ]
        .filter(Boolean)
        .join('\n');
    const html = `
    <h2>New ${escapeHtml(kind.toLowerCase())}</h2>
    <p>A new record was submitted to the Robotics Lab queue.</p>
    <p><strong>Title:</strong> ${escapeHtml(title)}<br />
    <strong>Requester:</strong> ${escapeHtml(requester)}<br />
    <strong>${escapeHtml(contact)}</strong><br />
    <strong>Record ID:</strong> ${escapeHtml(id)}</p>
    <p>Open the Robotics Lab website to review it.</p>
  `;
    const resend = new resend_1.Resend(resendApiKey.value());
    const results = await Promise.allSettled(recipients.map(async (recipient) => {
        const result = await resend.emails.send({
            from: notificationFromEmail.value(),
            to: recipient,
            subject,
            text,
            html,
        });
        if (result.error) {
            throw new Error(`${recipient}: ${result.error.message}`);
        }
    }));
    const failures = results
        .filter((result) => result.status === 'rejected')
        .map((result) => String(result.reason));
    if (failures.length > 0) {
        throw new Error(`Some admin notifications failed: ${failures.join('; ')}`);
    }
};
exports.notifyAdminsOfOrder = (0, firestore_2.onDocumentCreated)({
    document: 'orders/{orderId}',
    region: 'us-central1',
    secrets: [resendApiKey],
}, async (event) => {
    const data = event.data?.data();
    if (!data || !event.params.orderId)
        return;
    await sendAdminNotification('Order', event.params.orderId, data);
});
exports.notifyAdminsOfCustomRequest = (0, firestore_2.onDocumentCreated)({
    document: 'requests/{requestId}',
    region: 'us-central1',
    secrets: [resendApiKey],
}, async (event) => {
    const data = event.data?.data();
    if (!data || !event.params.requestId)
        return;
    await sendAdminNotification('Custom request', event.params.requestId, data);
});
