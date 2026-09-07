const { listAllDocuments, getDocument } = require('../_lib/firebase');
const { sendJson } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const now = Date.now();
    const active = (await listAllDocuments('sponsor_spotlights'))
      .filter(item => Date.parse(item.startAt) <= now && Date.parse(item.endAt) >= now)
      .sort((a, b) => String(b.startAt || '').localeCompare(String(a.startAt || '')))[0];
    if (!active) return sendJson(res, 200, { ok: true, spotlight: null });
    const sponsor = await getDocument('sponsorships', active.sponsorshipId);
    if (!sponsor || sponsor.publicListingConsent !== true || sponsor.publicListingApproved !== true || sponsor.paymentStatus !== 'paid') return sendJson(res, 200, { ok: true, spotlight: null });
    return sendJson(res, 200, { ok: true, spotlight: {
      company: sponsor.company || sponsor.sponsorName || '', city: sponsor.city || '', website: sponsor.website || '',
      clubName: sponsor.clubName || '', levelName: sponsor.levelName || '', children: Number(sponsor.children || 0),
      story: active.story || '', startAt: active.startAt, endAt: active.endAt,
    }});
  } catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'SPOTLIGHT_READ_FAILED' }); }
};