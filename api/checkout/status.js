const { getDocument } = require('../_lib/firebase');
const { sendJson, text } = require('../_lib/http');
const { recordAllowedForEnvironment } = require('../_lib/release');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const sessionId = text(req.query?.session_id, 200);
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return sendJson(res, 400, { ok: false, error: 'INVALID_SESSION_ID' });
    let [order, paymentException] = await Promise.all([getDocument('sponsorships', sessionId), getDocument('payment_exceptions', sessionId)]);
    if (order && !recordAllowedForEnvironment(order)) order = null;
    if (paymentException && !recordAllowedForEnvironment(paymentException)) paymentException = null;
    if (order) return sendJson(res, 200, { ok: true, fulfilled: true, order: { orderNumber: order.orderNumber, company: order.company, clubName: order.clubName, levelName: order.levelName, children: order.children, amount: order.amount, currency: order.currency, certificateId: order.certificateId, certificateStatus: order.certificateStatus } });
    if (paymentException) { const refundStatus = String(paymentException.refundStatus || 'pending_request').toLowerCase(); return sendJson(res, 200, { ok: true, fulfilled: false, paymentException: true, refundStatus, refunded: refundStatus === 'succeeded' }); }
    return sendJson(res, 202, { ok: true, fulfilled: false });
  } catch (error) { return sendJson(res, 500, { ok: false, error: error.code || 'CHECKOUT_STATUS_FAILED' }); }
};
