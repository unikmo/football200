const { sendJson } = require('../_lib/http');
const { STRIPE_EXPECTED_ACCOUNT_ID, verifyStripeAccount } = require('../_lib/stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  const webhookConfigured = Boolean(String(process.env.STRIPE_WEBHOOK_SECRET || '').trim());
  try {
    const account = await verifyStripeAccount();
    return sendJson(res, 200, {
      ok: true,
      configured: true,
      mode: 'test',
      accountId: account.id,
      expectedAccountId: STRIPE_EXPECTED_ACCOUNT_ID,
      webhookConfigured,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      configured: error.code !== 'STRIPE_NOT_CONFIGURED',
      error: error.code || 'STRIPE_HEALTH_FAILED',
      expectedAccountId: STRIPE_EXPECTED_ACCOUNT_ID,
      webhookConfigured,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    });
  }
};
