const { getDocument } = require('../_lib/firebase');
const { sendJson, text } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const sessionId = text(req.query?.session_id, 200);
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return sendJson(res, 400, { ok: false, error: 'INVALID_SESSION_ID' });
    const order = await getDocument('sponsorships', sessionId);
    if (!order) return sendJson(res, 202, { ok: true, fulfilled: false });
    return sendJson(res, 200, {
      ok: true,
      fulfilled: true,
      order: {
        orderNumber: order.orderNumber,
        company: order.company,
        clubName: order.clubName,
        levelName: order.levelName,
        children: order.children,
        amount: order.amount,
        currency: order.currency,
        certificateId: order.certificateId,
        certificateStatus: order.certificateStatus,
      },
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.code || 'CHECKOUT_STATUS_FAILED' });
  }
};
