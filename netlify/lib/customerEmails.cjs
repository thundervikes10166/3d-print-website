'use strict';

// Customer email wording. Edit the sentences here to change what customers receive.
const PICKUP = 'Hueneme High School, Room Q10';
const SIGNATURE = 'Thunder Vikes Robotics · Hueneme High School · Room Q10';

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const money = (value) => `$${Number(value).toFixed(2)}`;
const hasPrice = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

function firstName(record) {
  const name = String(record.customerFirstName || record.buyerDisplayName || record.requesterDisplayName || '').trim();
  return name.split(/\s+/)[0] || 'there';
}

/** Reference shown to customers; matches what the website displays. */
function reference(kind, record, id) {
  return kind === 'request' ? (record.ticketNumber || id) : `#${String(id).slice(0, 8).toUpperCase()}`;
}

function detailRows(kind, record, id) {
  const rows = [['Reference', reference(kind, record, id)]];
  if (kind === 'order') {
    rows.push(['Item', record.listingTitle], ['Quantity', record.quantity]);
    if (record.selectedSize) rows.push(['Size', record.selectedSize]);
    if (record.selectedColor) rows.push(['Color', record.selectedColor]);
    if (record.selectedOption) rows.push(['Option', record.selectedOption]);
    if (hasPrice(record.priceAtTimeOfOrder)) {
      rows.push(['Price', `${money(record.priceAtTimeOfOrder)} each`]);
      rows.push(['Total', money(record.priceAtTimeOfOrder * (record.quantity || 1))]);
    }
  } else {
    rows.push(['Item', record.itemTitle], ['Quantity', record.quantity]);
    if (record.desiredSize) rows.push(['Size', record.desiredSize]);
    if (record.material) rows.push(['Material', record.material]);
    if (record.color) rows.push(['Color(s)', record.color]);
    if (record.neededByDate) rows.push(['Needed by', record.neededByDate]);
    rows.push(['Price', record.estimatedCost || 'We will confirm the cost with you']);
  }
  return rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
}

function build(subject, greeting, paragraphs, rows) {
  const text = [
    greeting, '',
    ...paragraphs.flatMap((p) => [p, '']),
    'Your request details:',
    ...rows.map(([label, value]) => `  ${label}: ${value}`),
    '', 'Questions? Just reply to this email.', '', SIGNATURE,
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px">
<tr><td style="background:#0f172a;color:#ffffff;padding:16px 20px;border-radius:8px 8px 0 0;font-weight:bold;font-size:16px">Thunder Vikes Robotics <span style="color:#fca5a5;font-weight:normal">· 3D Print Store</span></td></tr>
<tr><td style="padding:20px;font-size:15px;line-height:1.5">
<p style="margin:0 0 14px">${esc(greeting)}</p>
${paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join('\n')}
<p style="margin:18px 0 6px;font-weight:bold">Your request details</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">
${rows.map(([label, value]) => `<tr><td style="padding:6px 8px;border-top:1px solid #e2e8f0;color:#64748b;width:35%">${esc(label)}</td><td style="padding:6px 8px;border-top:1px solid #e2e8f0">${esc(value)}</td></tr>`).join('\n')}
</table>
<p style="margin:18px 0 0;color:#475569;font-size:13px">Questions? Just reply to this email.</p>
</td></tr>
<tr><td style="padding:12px 20px;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0">${esc(SIGNATURE)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/** Sent right after a customer submits a shop purchase or a custom 3D print request. */
function confirmationEmail(kind, record, id) {
  return build(
    `We received your request (${reference(kind, record, id)}) - Thunder Vikes`,
    `Hi ${firstName(record)},`,
    [
      'Thank you for sending in your request. We will be reaching out within 2 business days to confirm or ask any questions.',
      `When your product is ready, we will reach out again and let you know to come pick up your print at ${PICKUP}.`,
    ],
    detailRows(kind, record, id),
  );
}

/** Sent when staff move an order or request to "Ready for pickup". */
function readyEmail(kind, record, id) {
  const item = kind === 'order' ? record.listingTitle : record.itemTitle;
  return build(
    `Your order is ready for pickup (${reference(kind, record, id)}) - Thunder Vikes`,
    `Hi ${firstName(record)},`,
    [
      `Good news! Your ${item || 'order'} is ready. Please come pick up your print at ${PICKUP}.`,
      'Please mention your reference number when you pick it up.',
    ],
    detailRows(kind, record, id),
  );
}

module.exports = { confirmationEmail, readyEmail, reference };
