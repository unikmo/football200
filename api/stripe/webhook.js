const crypto = require('crypto');
const { getDocument, createDocument, updateDocument } = require('../_lib/firebase');
const { createWrite, updateFieldsWrite, commitWrites } = require('../_lib/firestore-atomic');
const { sendJson } = require('../_lib/http');
const { PROGRAMME } = require('../_lib/programme');
const { verifyWebhookSignature, readRawBody } = require('../_lib/stripe');
const { sendCertificateEmail } = require('../_lib/email');

function certificateIdForSession(sessionId) { return crypto.createHash('sha256').update(String(sessionId)).digest('hex').slice(0, 32); }

async function fulfilFamilyPlus(session) {
  const existing = await getDocument('family_plus_orders', session.id);
  if (existing) return { idempotent: true, order: existing };
  if (String(session.currency || '').toLowerCase() !== 'eur' || Number(session.amount_total || 0) !== 2500) throw Object.assign(new Error('Family Plus amount mismatch'), { code: 'STRIPE_AMOUNT_MISMATCH' });
  const now = new Date().toISOString();
  const order = { stripeSessionId: session.id, stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : '', paymentStatus: 'paid', currency: 'EUR', amount: 25, passReference: String(session.metadata?.pass_reference || ''), email: session.customer_details?.email || session.customer_email || '', source: 'stripe-preview', createdAt: now, paidAt: now };
  await createDocument('family_plus_orders', order, session.id);
  await createDocument('operations_events', { type: 'family_plus.paid', stripeSessionId: session.id, passReference: order.passReference, amount: 25, createdAt: now });
  return { idempotent: false, order };
}

async function fulfilPaidSession(session, req) {
  const existing = await getDocument('sponsorships', session.id);
  if (existing) return { idempotent: true, order: existing };
  const m = session.metadata || {};
  const tier = PROGRAMME.tiers[m.tier];
  const club = await getDocument('clubs', m.club_id);
  if (!tier || !club || club.status !== 'active') throw Object.assign(new Error('Checkout metadata no longer maps to an active programme'), { code: 'PROGRAMME_MAPPING_INVALID' });
  if (String(session.currency || '').toLowerCase() !== 'eur' || Number(session.amount_total || 0) !== tier.amount * 100) throw Object.assign(new Error('Stripe amount does not match canonical sponsorship tier'), { code: 'STRIPE_AMOUNT_MISMATCH' });

  const released = Number(club.releasedPlaces || 0), sponsored = Number(club.sponsoredPlaces || 0);
  if (released - sponsored < tier.children) throw Object.assign(new Error('Club capacity exhausted before fulfilment'), { code: 'CAPACITY_EXHAUSTED' });
  const now = new Date().toISOString(), certId = certificateIdForSession(session.id), customerEmail = session.customer_details?.email || session.customer_email || '';
  const orderNumber = `F200-${String(club.season || 'SEASON').replace(/[^0-9A-Za-z]/g, '')}-${String(session.id).slice(-8).toUpperCase()}`;
  const publicListingConsent = String(m.public_listing_consent || '').toLowerCase() === 'true';
  const order = { orderNumber, stripeSessionId: session.id, stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : '', paymentStatus: 'paid', currency: 'EUR', amount: tier.amount, children: tier.children, level: m.tier, levelName: tier.name, sponsorName: m.company || '', company: m.company || '', city: m.city || '', website: m.website || '', publicListingConsent, publicListingApproved: false, contactName: m.contact_name || '', email: customerEmail, clubId: club.id, clubName: club.name || '', season: club.season || '', certificateId: certId, certificateStatus: 'generated', source: 'stripe-preview', createdAt: now, paidAt: now };
  const certificate = { sponsorshipId: session.id, orderNumber, sponsorName: order.sponsorName, company: order.company, city: order.city, recipientEmail: customerEmail, clubId: club.id, clubName: order.clubName, season: order.season, level: order.level, levelName: order.levelName, children: order.children, status: 'generated', deliveryStatus: 'pending', generatedAt: now, createdAt: now, updatedAt: now };

  try { await commitWrites([updateFieldsWrite('clubs', club.id, { sponsoredPlaces: sponsored + tier.children, updatedAt: now }, club._updateTime), createWrite('sponsorships', session.id, order), createWrite('certificates', certId, certificate)]); }
  catch (error) { const after = await getDocument('sponsorships', session.id).catch(() => null); if (after) return { idempotent: true, order: after }; throw error; }
  await createDocument('operations_events', { type: 'sponsorship.paid', sponsorshipId: session.id, orderNumber, clubId: club.id, children: tier.children, amount: tier.amount, createdAt: now });

  const proto = req.headers['x-forwarded-proto'] || 'https', host = req.headers['x-forwarded-host'] || req.headers.host;
  const certificateUrl = `${proto}://${host}/zertifikat.html?id=${encodeURIComponent(certId)}`;
  try {
    const delivery = await sendCertificateEmail({ to: customerEmail, company: order.company, clubName: order.clubName, tierName: tier.name, certificateUrl });
    if (delivery.ok) { await updateDocument('certificates', certId, { status: 'sent', deliveryStatus: 'sent', sentAt: new Date().toISOString(), updatedAt: new Date().toISOString(), emailProviderId: delivery.id }); await updateDocument('sponsorships', session.id, { certificateStatus: 'sent' }); await createDocument('operations_events', { type: 'certificate.sent', certificateId: certId, sponsorshipId: session.id, createdAt: new Date().toISOString() }); }
    else await updateDocument('certificates', certId, { deliveryStatus: 'pending_configuration', updatedAt: new Date().toISOString() });
  } catch (error) { await updateDocument('certificates', certId, { status: 'failed', deliveryStatus: 'failed', lastError: error.code || 'EMAIL_DELIVERY_FAILED', updatedAt: new Date().toISOString() }).catch(() => null); await updateDocument('sponsorships', session.id, { certificateStatus: 'failed' }).catch(() => null); }
  return { idempotent: false, order };
}

async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV !== 'test') return sendJson(res, 403, { ok: false, error: 'PREVIEW_ONLY' });
  try {
    const raw = await readRawBody(req), secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!verifyWebhookSignature(raw, req.headers['stripe-signature'], secret)) return sendJson(res, 400, { ok: false, error: 'INVALID_STRIPE_SIGNATURE' });
    const event = JSON.parse(raw);
    if (event.livemode === true) return sendJson(res, 400, { ok: false, error: 'LIVE_STRIPE_EVENT_BLOCKED' });
    const session = event.data?.object;
    const relevant = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
    if (relevant && session?.object === 'checkout.session' && session.payment_status === 'paid') {
      if (session.metadata?.product_type === 'family_plus') await fulfilFamilyPlus(session);
      else await fulfilPaidSession(session, req);
    }
    return sendJson(res, 200, { received: true });
  } catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'STRIPE_WEBHOOK_FAILED' }); }
}
module.exports = handler;
module.exports.config = { api: { bodyParser: false } };