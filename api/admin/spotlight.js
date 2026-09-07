const crypto = require('crypto');
const { listAllDocuments, getDocument, createDocument } = require('../_lib/firebase');
const { sendJson, readJsonBody, previewWritesAllowed, text } = require('../_lib/http');
const { requireAdmin } = require('../_lib/admin-auth');

function validDate(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? d : null; }

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res).ok) return;
  if (req.method === 'GET') {
    try { return sendJson(res, 200, { ok: true, items: await listAllDocuments('sponsor_spotlights') }); }
    catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'SPOTLIGHT_LIST_FAILED' }); }
  }
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!previewWritesAllowed()) return sendJson(res, 403, { ok: false, error: 'PREVIEW_ONLY' });
  try {
    const body = await readJsonBody(req);
    const sponsorshipId = text(body.sponsorshipId, 220);
    const story = text(body.story, 700);
    const start = validDate(body.startAt);
    const end = validDate(body.endAt);
    if (!sponsorshipId || !start || !end || end <= start) return sendJson(res, 400, { ok: false, error: 'VALIDATION_FAILED' });
    if (end - start > 8 * 24 * 60 * 60 * 1000) return sendJson(res, 400, { ok: false, error: 'SPOTLIGHT_MAX_8_DAYS' });
    const sponsorship = await getDocument('sponsorships', sponsorshipId);
    if (!sponsorship || sponsorship.paymentStatus !== 'paid') return sendJson(res, 404, { ok: false, error: 'SPONSORSHIP_NOT_FOUND' });
    if (sponsorship.publicListingConsent !== true || sponsorship.publicListingApproved !== true) return sendJson(res, 409, { ok: false, error: 'PUBLICATION_APPROVAL_REQUIRED' });
    const id = crypto.createHash('sha256').update(`${sponsorshipId}:${start.toISOString()}:${end.toISOString()}`).digest('hex').slice(0, 28);
    const item = { sponsorshipId, startAt: start.toISOString(), endAt: end.toISOString(), story, status: 'scheduled', createdAt: new Date().toISOString() };
    await createDocument('sponsor_spotlights', item, id);
    return sendJson(res, 201, { ok: true, id, ...item });
  } catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'SPOTLIGHT_CREATE_FAILED' }); }
};