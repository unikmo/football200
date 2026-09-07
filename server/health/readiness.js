const { getFirebaseConfig } = require('../_lib/firebase');
const { getEmailConfigurationStatus } = require('../_lib/email');
const { sendJson } = require('../_lib/http');
const { releaseState } = require('../_lib/release');
const { expectedStripeAccountId, expectedStripeLivemode } = require('../_lib/stripe');

function configured(name) { return Boolean(String(process.env[name] || '').trim()); }
function validGtmId(value) { return /^GTM-[A-Z0-9]+$/i.test(String(value || '').trim()); }

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const state = releaseState();
  let firebaseConfigured = true;
  try { getFirebaseConfig(); } catch { firebaseConfigured = false; }
  let stripeExpectedAccountConfigured = true;
  let stripeExpectedAccountId = null;
  try { stripeExpectedAccountId = expectedStripeAccountId(); } catch { stripeExpectedAccountConfigured = false; }
  const email = getEmailConfigurationStatus();
  const adminConfigured = configured('FOOTBALL200_ADMIN_PASSWORD') && configured('FOOTBALL200_ADMIN_SESSION_SECRET');
  const stripeConfigured = configured('STRIPE_SECRET_KEY');
  const webhookConfigured = configured('STRIPE_WEBHOOK_SECRET');
  const analyticsProviderConfigured = validGtmId(process.env.PUBLIC_GTM_ID);
  const blockers = [];
  if (!firebaseConfigured) blockers.push('FIREBASE_NOT_CONFIGURED');
  if (!adminConfigured) blockers.push('ADMIN_AUTH_NOT_CONFIGURED');
  if (!email.configured) blockers.push('EMAIL_NOT_CONFIGURED');
  if (!stripeConfigured) blockers.push('STRIPE_NOT_CONFIGURED');
  if (!stripeExpectedAccountConfigured) blockers.push('STRIPE_EXPECTED_ACCOUNT_NOT_CONFIGURED');
  if (!webhookConfigured) blockers.push('STRIPE_WEBHOOK_NOT_CONFIGURED');
  if (!state.distributedAbuseControlsReady) blockers.push('DISTRIBUTED_ABUSE_CONTROLS_NOT_READY');
  if (!state.publicReleaseEnabled) blockers.push('PUBLIC_RELEASE_NOT_APPROVED');
  if (!state.legalReleaseApproved) blockers.push('LEGAL_RELEASE_NOT_APPROVED');
  if (!state.paymentsReleaseApproved) blockers.push('PAYMENTS_RELEASE_NOT_APPROVED');
  if (!state.productionOperationsEnabled) blockers.push('PRODUCTION_OPERATIONS_NOT_APPROVED');
  if (!state.minorDataReleaseApproved) blockers.push('MINOR_DATA_RELEASE_NOT_APPROVED');
  blockers.push('REAL_MINOR_WORKFLOW_NOT_IMPLEMENTED');
  if (!state.analyticsReleaseApproved || !state.analyticsConsentReady || !analyticsProviderConfigured) blockers.push('ANALYTICS_NETWORK_NOT_READY');
  return sendJson(res, 200, {
    ok: true,
    environment: state.environment,
    release: {
      publicReleaseEnabled: state.publicReleaseEnabled,
      legalReleaseApproved: state.legalReleaseApproved,
      paymentsReleaseApproved: state.paymentsReleaseApproved,
      productionOperationsEnabled: state.productionOperationsEnabled,
      minorDataReleaseApproved: state.minorDataReleaseApproved,
      analyticsReleaseApproved: state.analyticsReleaseApproved,
      analyticsConsentReady: state.analyticsConsentReady,
      distributedAbuseControlsReady: state.distributedAbuseControlsReady,
    },
    services: {
      firebaseConfigured,
      adminConfigured,
      email,
      stripe: { configured: stripeConfigured, webhookConfigured, expectedAccountConfigured: stripeExpectedAccountConfigured, expectedAccountId: stripeExpectedAccountId, expectedMode: expectedStripeLivemode() === true ? 'live' : 'test' },
      analyticsProviderConfigured,
      distributedAbuseControlsReady: state.distributedAbuseControlsReady,
    },
    implementation: { minorData: 'synthetic-only', analytics: 'local-event-layer-ready', localRateLimit: 'defense-in-depth-only' },
    readiness: { productionReady: state.production && blockers.length === 0, blockers },
  });
};
