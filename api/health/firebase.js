const { getFirebaseConfig, listDocuments } = require('../_lib/firebase');
const { sendJson } = require('../_lib/http');
const { STRIPE_EXPECTED_ACCOUNT_ID, verifyStripeAccount } = require('../_lib/stripe');

async function stripeStatus() {
  const webhookConfigured = Boolean(String(process.env.STRIPE_WEBHOOK_SECRET || '').trim());
  try {
    const account = await verifyStripeAccount();
    return {
      ok: true,
      configured: true,
      mode: 'test',
      accountId: account.id,
      expectedAccountId: STRIPE_EXPECTED_ACCOUNT_ID,
      webhookConfigured,
    };
  } catch (error) {
    return {
      ok: false,
      configured: error.code !== 'STRIPE_NOT_CONFIGURED',
      error: error.code || 'STRIPE_HEALTH_FAILED',
      expectedAccountId: STRIPE_EXPECTED_ACCOUNT_ID,
      webhookConfigured,
    };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  let config = null;
  try {
    config = getFirebaseConfig();
    await listDocuments('_health_probe', 1);
    const stripe = await stripeStatus();
    return sendJson(res, 200, {
      ok: true,
      configured: true,
      projectId: config.projectId,
      databaseId: config.databaseId,
      environment: process.env.VERCEL_ENV || 'unknown',
      stripe,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      configured: error.code !== 'FIREBASE_NOT_CONFIGURED',
      error: error.code || 'FIREBASE_HEALTH_FAILED',
      upstreamStatus: Number.isInteger(error.status) ? error.status : null,
      projectId: config?.projectId || null,
      databaseId: config?.databaseId || null,
      environment: process.env.VERCEL_ENV || 'unknown',
    });
  }
};
