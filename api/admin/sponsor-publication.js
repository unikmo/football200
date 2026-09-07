const { listAllDocuments, getDocument, updateDocument, createDocument } = require('../_lib/firebase');
const { sendJson, readJsonBody, previewWritesAllowed, text } = require('../_lib/http');
const { requireAdmin } = require('../_lib/admin-auth');

function cleanWebsite(value) {
  const raw = text(value, 300);
  if (!raw) return '';
  try { const url = new URL(raw); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; }
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res).ok) return;
  if (req.method === 'GET') {
    try {
      const items = (await listAllDocuments('sponsorships')).map(item => ({
        id: item.id,
        company: item.company || item.sponsorName || '',
        clubName: item.clubName || '',
        season: item.season || '',
        levelName: item.levelName || '',
        website: item.website || '',
        consent: item.publicListingConsent === true,
        approved: item.publicListingApproved === true,
        paymentStatus: item.paymentStatus || '',
      }));
      return sendJson(res, 200, { ok: true, items });
    } catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'PUBLICATION_LIST_FAILED' }); }
  }
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!previewWritesAllowed()) return sendJson(res, 403, { ok: false, error: 'PREVIEW_ONLY' });
  try {
    const body = await readJsonBody(req);
    const id = text(body.id, 220);
    const existing = await getDocument('sponsorships', id);
    if (!existing || existing.paymentStatus !== 'paid') return sendJson(res, 404, { ok: false, error: 'SPONSORSHIP_NOT_FOUND' });
    const approved = body.approved === true;
    if (approved && existing.publicListingConsent !== true) return sendJson(res, 409, { ok: false, error: 'PUBLICATION_CONSENT_REQUIRED' });
    const website = body.website === undefined ? existing.website || '' : cleanWebsite(body.website);
    const now = new Date().toISOString();
    await updateDocument('sponsorships', id, { publicListingApproved: approved, website, publicListingReviewedAt: now });
    await createDocument('operations_events', { type: approved ? 'sponsor.publication_approved' : 'sponsor.publication_revoked', sponsorshipId: id, createdAt: now });
    return sendJson(res, 200, { ok: true, id, approved, website });
  } catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'PUBLICATION_UPDATE_FAILED' }); }
};