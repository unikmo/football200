function flag(name) {
  return String(process.env[name] || '').trim().toLowerCase() === 'true';
}

function environmentName() {
  if (process.env.NODE_ENV === 'test') return 'test';
  return process.env.VERCEL_ENV || 'development';
}

function releaseState() {
  const environment = environmentName();
  const preview = environment === 'preview';
  const production = environment === 'production';
  const test = environment === 'test';
  const publicReleaseEnabled = flag('PUBLIC_RELEASE_ENABLED');
  const legalReleaseApproved = flag('LEGAL_RELEASE_APPROVED');
  const paymentsReleaseApproved = flag('PAYMENTS_RELEASE_APPROVED');
  const minorDataReleaseApproved = flag('MINOR_DATA_RELEASE_APPROVED');
  const productionOperationsEnabled = flag('PRODUCTION_OPERATIONS_ENABLED');
  const analyticsReleaseApproved = flag('ANALYTICS_RELEASE_APPROVED');
  const analyticsConsentReady = flag('ANALYTICS_CONSENT_READY');
  const publicBase = production && publicReleaseEnabled && legalReleaseApproved;
  return {
    environment,
    preview,
    production,
    test,
    publicReleaseEnabled,
    legalReleaseApproved,
    paymentsReleaseApproved,
    minorDataReleaseApproved,
    productionOperationsEnabled,
    analyticsReleaseApproved,
    analyticsConsentReady,
    productionPublicWrites: publicBase,
    productionPaymentWrites: publicBase && paymentsReleaseApproved,
    productionMinorWrites: publicBase && minorDataReleaseApproved,
    productionMinorPaymentWrites: publicBase && minorDataReleaseApproved && paymentsReleaseApproved,
    productionAdminWrites: production && productionOperationsEnabled,
  };
}

function writeAllowed(scope = 'public') {
  const state = releaseState();
  if (state.preview || state.test) return true;
  if (!state.production) return false;
  if (scope === 'payment') return state.productionPaymentWrites;
  if (scope === 'minor') return state.productionMinorWrites;
  if (scope === 'minor-payment') return state.productionMinorPaymentWrites;
  if (scope === 'admin') return state.productionAdminWrites;
  if (scope === 'minor-admin') return state.productionAdminWrites && state.legalReleaseApproved && state.minorDataReleaseApproved;
  return state.productionPublicWrites;
}

function expectedStripeLivemode() {
  const state = releaseState();
  if (state.production) return true;
  if (state.preview || state.test) return false;
  return null;
}

function sourceTag(base) {
  const env = releaseState().environment;
  return `${base}-${env}`;
}

module.exports = { flag, environmentName, releaseState, writeAllowed, expectedStripeLivemode, sourceTag };
