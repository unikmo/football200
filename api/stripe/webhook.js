const crypto = require('crypto');
const { getDocument, listAllDocuments, createDocument, updateDocument } = require('../_lib/firebase');
const { createWrite, updateFieldsWrite, commitWrites } = require('../_lib/firestore-atomic');
const { sendJson } = require('../_lib/http');
const { PROGRAMME } = require('../_lib/programme');
const { stripePost, verifyWebhookSignature, readRawBody, assertStripeEventMode } = require('../_lib/stripe');
const { sendCertificateEmail } = require('../_lib/email');
const { deploymentOrigin } = require('../_lib/origin');
const { writeAllowed, releaseState, sourceTag } = require('../_lib/release');

const AUTO_REFUND_CODES = new Set(['CAPACITY_EXHAUSTED','PROGRAMME_MAPPING_INVALID','STRIPE_AMOUNT_MISMATCH']);
function certificateIdForSession(sessionId) { return crypto.createHash('sha256').update(String(sessionId)).digest('hex').slice(0, 32); }
function shouldAutoRefund(error) { return AUTO_REFUND_CODES.has(String(error?.code || '')); }
function paymentIntentId(session) { return typeof session?.payment_intent === 'string' ? session.payment_intent : String(session?.payment_intent?.id || ''); }
function customerEmail(session) { return String(session?.customer_details?.email || session?.customer_email || '').trim().toLowerCase(); }

async function refundUnfulfillableSession(session, cause) {
  const paymentIntent = paymentIntentId(session);
  if (!paymentIntent) throw Object.assign(new Error('Paid Checkout Session has no PaymentIntent for refund'), { code: 'REFUND_PAYMENT_INTENT_MISSING' });
  const existing = await getDocument('payment_exceptions', session.id);
  if (existing?.refundId) {
    if (['failed','canceled'].includes(String(existing.refundStatus || '').toLowerCase())) throw Object.assign(new Error('Existing refund requires manual review'), { code: 'REFUND_REQUIRES_MANUAL_REVIEW' });
    return { idempotent: true, exception: existing };
  }
  const now = new Date().toISOString();
  if (!existing) {
    await createDocument('payment_exceptions', {
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntent,
      reason: String(cause.code || 'FULFILMENT_REJECTED'),
      refundStatus: 'pending_request',
      amount: Number(session.amount_total || 0) / 100,
      currency: String(session.currency || '').toUpperCase(),
      company: String(session.metadata?.company || ''),
      email: customerEmail(session),
      clubId: String(session.metadata?.club_id || ''),
      tier: String(session.metadata?.tier || ''),
      source: sourceTag('stripe-refund'),
      createdAt: now,
      updatedAt: now,
    }, session.id);
  }
  let refund;
  try {
    refund = await stripePost('/refunds', {
      payment_intent: paymentIntent,
      'metadata[football200_reason]': String(cause.code || 'FULFILMENT_REJECTED'),
      'metadata[checkout_session_id]': String(session.id),
    }, `football200:refund:${session.id}`);
  } catch (error) {
    await updateDocument('payment_exceptions', session.id, { refundStatus: 'request_failed', lastError: error.code || 'STRIPE_REFUND_FAILED', updatedAt: new Date().toISOString() }).catch(() => null);
    throw error;
  }
  const refundStatus = String(refund.status || 'submitted').toLowerCase();
  const updatedAt = new Date().toISOString();
  await updateDocument('payment_exceptions', session.id, { refundId: String(refund.id || ''), refundStatus, updatedAt });
  await createDocument('operations_events', { type: 'sponsorship.auto_refund', stripeSessionId: session.id, refundId: String(refund.id || ''), refundStatus, reason: String(cause.code || ''), amount: Number(session.amount_total || 0) / 100, source: sourceTag('stripe-refund'), createdAt: updatedAt });
  if (['failed','canceled'].includes(refundStatus)) throw Object.assign(new Error('Stripe refund requires manual review'), { code: 'REFUND_REQUIRES_MANUAL_REVIEW' });
  return { idempotent: false, refund };
}

async function fulfilFamilyPlus(session) {
  const existing = await getDocument('family_plus_orders', session.id);
  if (existing) return { idempotent: true, order: existing };
  if (String(session.currency || '').toLowerCase() !== 'eur' || Number(session.amount_total || 0) !== 2500) throw Object.assign(new Error('Family Plus amount mismatch'), { code: 'STRIPE_AMOUNT_MISMATCH' });
  const passReference = String(session.metadata?.pass_reference || '').trim();
  const customer = customerEmail(session);
  if (!passReference || !customer) throw Object.assign(new Error('Family Plus eligibility metadata missing'), { code: 'FAMILY_PLUS_ELIGIBILITY_INVALID' });
  const expectSynthetic = !releaseState().production;
  const [confirmations, orders] = await Promise.all([listAllDocuments('guardian_confirmations'), listAllDocuments('family_plus_orders')]);
  const confirmation = confirmations.find(item => (item.syntheticTest === true) === expectSynthetic && item.passReference === passReference && String(item.guardianEmail || '').trim().toLowerCase() === customer);
  if (!confirmation) throw Object.assign(new Error('Family Plus confirmation not found'), { code: 'FAMILY_PLUS_ELIGIBILITY_INVALID' });
  const prior = orders.find(item => item.paymentStatus === 'paid' && item.passReference === passReference);
  if (prior) return { idempotent: true, order: prior };
  const now = new Date().toISOString();
  const order = { stripeSessionId: session.id, stripePaymentIntentId: paymentIntentId(session), paymentStatus: 'paid', currency: 'EUR', amount: 25, passReference, email: customer, source: sourceTag('stripe'), createdAt: now, paidAt: now };
  await createDocument('family_plus_orders', order, session.id);
  await createDocument('operations_events', { type: 'family_plus.paid', stripeSessionId: session.id, passReference: order.passReference, amount: 25, source: sourceTag('stripe'), createdAt: now });
  return { idempotent: false, order };
}

async function fulfilPaidSession(session, req) {
  const existing = await getDocument('sponsorships', session.id);
  if (existing) return { idempotent: true, order: existing };
  const m = session.metadata || {};
  const tier = PROGRAMME.tiers[m.tier];
  const club = await getDocument('clubs', m.club_id);
  if (!tier || !club || club.status !== 'active' || String(m.season || '') !== String(club.season || '')) throw Object.assign(new Error('Checkout metadata no longer maps to the active club season'), { code: 'PROGRAMME_MAPPING_INVALID' });
  if (String(session.currency || '').toLowerCase() !== 'eur' || Number(session.amount_total || 0) !== tier.amount * 100) throw Object.assign(new Error('Stripe amount does not match canonical sponsorship tier'), { code: 'STRIPE_AMOUNT_MISMATCH' });

  const released = Number(club.releasedPlaces || 0), sponsored = Number(club.sponsoredPlaces || 0);
  if (released - sponsored < tier.children) throw Object.assign(new Error('Club capacity exhausted before fulfilment'), { code: 'CAPACITY_EXHAUSTED' });
  const now = new Date().toISOString(), certId = certificateIdForSession(session.id), customer = customerEmail(session);
  const orderNumber = `F200-${String(club.season || 'SEASON').replace(/[^0-9A-Za-z]/g, '')}-${String(session.id).slice(-8).toUpperCase()}`;
  const publicListingConsent = String(m.public_listing_consent || '').toLowerCase() === 'true';
  const order = { orderNumber, stripeSessionId: session.id, stripePaymentIntentId: paymentIntentId(session), paymentStatus: 'paid', currency: 'EUR', amount: tier.amount, children: tier.children, level: m.tier, levelName: tier.name, sponsorName: m.company || '', company: m.company || '', city: m.city || '', website: m.website || '', publicListingConsent, publicListingApproved: false, contactName: m.contact_name || '', email: customer, clubId: club.id, clubName: club.name || '', season: club.season || '', certificateId: certId, certificateStatus: 'generated', source: sourceTag('stripe'), createdAt: now, paidAt: now };
  const certificate = { sponsorshipId: session.id, orderNumber, sponsorName: order.sponsorName, company: order.company, city: order.city, recipientEmail: customer, clubId: club.id, clubName: order.clubName, season: order.season, level: order.level, levelName: order.levelName, children: order.children, status: 'generated', deliveryStatus: 'pending', generatedAt: now, createdAt: now, updatedAt: now };

  try { await commitWrites([updateFieldsWrite('clubs', club.id, { sponsoredPlaces: sponsored + tier.children, updatedAt: now }, club._updateTime), createWrite('sponsorships', session.id, order), createWrite('certificates', certId, certificate)]); }
  catch (error) { const after = await getDocument('sponsorships', session.id).catch(() => null); if (after) return { idempotent: true, order: after }; throw error; }
  await createDocument('operations_events', { type: 'sponsorship.paid', sponsorshipId: session.id, orderNumber, clubId: club.id, children: tier.children, amount: tier.amount, source: sourceTag('stripe'), createdAt: now });

  const certificateUrl = `${deploymentOrigin(req)}/zertifikat.html?id=${encodeURIComponent(certId)}`;
  try {
    const delivery = await sendCertificateEmail({ to: customer, company: order.company, clubName: order.clubName, tierName: tier.name, certificateUrl, idempotencyKey: `football200-certificate-${certId}` });
    if (delivery.ok) { await updateDocument('certificates', certId, { status: 'sent', deliveryStatus: 'sent', sentAt: new Date().toISOString(), updatedAt: new Date().toISOString(), emailProviderId: delivery.id }); await updateDocument('sponsorships', session.id, { certificateStatus: 'sent' }); await createDocument('operations_events', { type: 'certificate.sent', certificateId: certId, sponsorshipId: session.id, source: sourceTag('stripe'), createdAt: new Date().toISOString() }); }
    else await updateDocument('certificates', certId, { deliveryStatus: 'pending_configuration', updatedAt: new Date().toISOString() });
  } catch (error) { await updateDocument('certificates', certId, { status: 'failed', deliveryStatus: 'failed', lastError: error.code || 'EMAIL_DELIVERY_FAILED', updatedAt: new Date().toISOString() }).catch(() => null); await updateDocument('sponsorships', session.id, { certificateStatus: 'failed' }).catch(() => null); }
  return { idempotent: false, order };
}

async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!writeAllowed('payment')) return sendJson(res, 403, { ok: false, error: 'RELEASE_GATE_BLOCKED' });
  try {
    const raw = await readRawBody(req), secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!verifyWebhookSignature(raw, req.headers['stripe-signature'], secret)) return sendJson(res, 400, { ok: false, error: 'INVALID_STRIPE_SIGNATURE' });
    const event = JSON.parse(raw);
    assertStripeEventMode(event);
    const session = event.data?.object;
    const relevant = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
    if (relevant && session?.object === 'checkout.session' && session.payment_status === 'paid') {
      if (session.metadata?.product_type === 'family_plus') {
        if (!writeAllowed('minor-payment')) return sendJson(res, 403, { ok: false, error: 'MINOR_PAYMENT_RELEASE_GATE_BLOCKED' });
        await fulfilFamilyPlus(session);
      } else {
        try { await fulfilPaidSession(session, req); }
        catch (error) { if (!shouldAutoRefund(error)) throw error; await refundUnfulfillableSession(session, error); }
      }
    }
    return sendJson(res, 200, { received: true });
  } catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'STRIPE_WEBHOOK_FAILED' }); }
}
module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
module.exports.shouldAutoRefund = shouldAutoRefund;
