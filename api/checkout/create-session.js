const { getDocument } = require('../_lib/firebase');
const { sendJson, readJsonBody, text, email } = require('../_lib/http');
const { PROGRAMME, normalizeTier } = require('../_lib/programme');
const { stripePost, ensureStripeSessionMode } = require('../_lib/stripe');
const { enforceRateLimit } = require('../_lib/rate-limit');
const { deploymentOrigin } = require('../_lib/origin');
const { writeAllowed } = require('../_lib/release');
const { checkoutIdentity } = require('../_lib/idempotency');

function cleanWebsite(value) { const raw = text(value, 300); if (!raw) return ''; try { const url = new URL(raw); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!writeAllowed('payment')) return sendJson(res, 403, { ok: false, error: 'RELEASE_GATE_BLOCKED' });
  if (!enforceRateLimit(req,res,{bucket:'sponsor-checkout',limit:10,windowMs:10*60*1000})) return;
  try {
    const body = await readJsonBody(req); const company = text(body.company, 180); const city = text(body.city, 140); const contactName = text(body.contactName, 140); const customerEmail = email(body.email); const website = cleanWebsite(body.website); const publicListingConsent = body.publicListingConsent === true; const clubId = text(body.clubId, 180); const tierKey = normalizeTier(body.level); const tier = tierKey ? PROGRAMME.tiers[tierKey] : null;
    if (!company || !city || !contactName || !customerEmail || !clubId || !tier) return sendJson(res, 400, { ok: false, error: 'VALIDATION_FAILED' });
    const club = await getDocument('clubs', clubId); if (!club || club.status !== 'active') return sendJson(res, 409, { ok: false, error: 'CLUB_NOT_AVAILABLE' });
    const released = Number(club.releasedPlaces || 0), sponsored = Number(club.sponsoredPlaces || 0); if (released - sponsored < tier.children) return sendJson(res, 409, { ok: false, error: 'INSUFFICIENT_CLUB_CAPACITY' });
    const identity = checkoutIdentity('sponsorship', body.checkoutRequestId, [clubId, String(club.season || ''), tierKey, customerEmail, company, city, contactName, website, publicListingConsent ? '1' : '0']);
    const intentId = identity.intentId, origin = deploymentOrigin(req); const metadata = { product_type: 'sponsorship', order_intent_id: intentId, club_id: club.id, club_name: String(club.name || ''), season: String(club.season || ''), tier: tierKey, tier_name: tier.name, children: String(tier.children), amount_eur: String(tier.amount), company, city, contact_name: contactName, website, public_listing_consent: publicListingConsent ? 'true' : 'false' };
    const params = { mode: 'payment', locale: 'de', customer_email: customerEmail, client_reference_id: intentId, billing_address_collection: 'required', success_url: `${origin}/sponsor/erfolg.html?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/sponsor/checkout.html?cancelled=1`, 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(tier.amount * 100), 'line_items[0][price_data][product_data][name]': `${PROGRAMME.name} · ${tier.name}`, 'line_items[0][price_data][product_data][description]': `${tier.children} ${tier.children === 1 ? 'Kind' : 'Kinder'} · ${club.name} · Saison ${club.season || ''}` };
    for (const [key, value] of Object.entries(metadata)) { params[`metadata[${key}]`] = value; params[`payment_intent_data[metadata][${key}]`] = value; }
    const session = await stripePost('/checkout/sessions', params, identity.stripeKey); await ensureStripeSessionMode(session); return sendJson(res, 201, { ok: true, url: session.url, sessionId: session.id, requestId: identity.requestId });
  } catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'CHECKOUT_SESSION_FAILED' }); }
};
