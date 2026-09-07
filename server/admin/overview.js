const { listAllDocuments } = require('../_lib/firebase');
const { sendJson } = require('../_lib/http');
const { summarizeAdminData } = require('../_lib/admin');
const { requireAdmin } = require('../_lib/admin-auth');

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res).ok) return;
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  try {
    const [orders, certificates, sponsorLeads, clubLeads, clubs, paymentExceptions] = await Promise.all([
      listAllDocuments('sponsorships'),
      listAllDocuments('certificates'),
      listAllDocuments('sponsor_interest'),
      listAllDocuments('club_interest'),
      listAllDocuments('clubs'),
      listAllDocuments('payment_exceptions'),
    ]);

    const data = summarizeAdminData({ orders, certificates, sponsorLeads, clubLeads, clubs, paymentExceptions });
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
