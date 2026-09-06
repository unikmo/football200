const { listDocuments } = require('../_lib/firebase');
const { sendJson, previewWritesAllowed } = require('../_lib/http');
const { summarizeAdminData } = require('../_lib/admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!previewWritesAllowed()) return sendJson(res, 403, { ok: false, error: 'PREVIEW_ADMIN_ONLY' });

  try {
    const [orders, certificates, sponsorLeads, clubLeads, clubs] = await Promise.all([
      listDocuments('sponsorships', 100),
      listDocuments('certificates', 100),
      listDocuments('sponsor_interest', 100),
      listDocuments('club_interest', 100),
      listDocuments('clubs', 100),
    ]);

    const data = summarizeAdminData({ orders, certificates, sponsorLeads, clubLeads, clubs });
    return sendJson(res, 200, {
      ok: true,
      environment: process.env.VERCEL_ENV || 'unknown',
      generatedAt: new Date().toISOString(),
      ...data,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error.code || 'ADMIN_OVERVIEW_FAILED',
      upstreamStatus: Number.isInteger(error.status) ? error.status : null,
    });
  }
};
