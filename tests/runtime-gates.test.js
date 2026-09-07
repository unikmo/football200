const test = require('node:test');
const assert = require('node:assert/strict');
const { releaseState, writeAllowed, expectedStripeLivemode } = require('../api/_lib/release');
const { expectedStripeAccountId, DEFAULT_PREVIEW_ACCOUNT_ID } = require('../api/_lib/stripe');

function withEnv(values, fn) {
  const keys = Object.keys(values);
  const before = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const [k,v] of Object.entries(values)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  try { return fn(); } finally { for (const [k,v] of Object.entries(before)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
}

test('preview permits staging writes but requires sandbox Stripe mode', () => withEnv({ NODE_ENV:'development', VERCEL_ENV:'preview', STRIPE_EXPECTED_ACCOUNT_ID:undefined }, () => {
  assert.equal(writeAllowed('public'), true);
  assert.equal(writeAllowed('payment'), true);
  assert.equal(expectedStripeLivemode(), false);
  assert.equal(expectedStripeAccountId(), DEFAULT_PREVIEW_ACCOUNT_ID);
}));

test('production public and payment writes stay blocked until explicit gates are enabled', () => withEnv({ NODE_ENV:'production', VERCEL_ENV:'production', PUBLIC_RELEASE_ENABLED:'false', LEGAL_RELEASE_APPROVED:'false', PAYMENTS_RELEASE_APPROVED:'false', DISTRIBUTED_ABUSE_CONTROLS_READY:'false' }, () => {
  assert.equal(writeAllowed('public'), false);
  assert.equal(writeAllowed('payment'), false);
  assert.equal(expectedStripeLivemode(), true);
}));

test('production payment writes require public, legal, abuse-control and payment approval together', () => withEnv({ NODE_ENV:'production', VERCEL_ENV:'production', PUBLIC_RELEASE_ENABLED:'true', LEGAL_RELEASE_APPROVED:'true', PAYMENTS_RELEASE_APPROVED:'true', DISTRIBUTED_ABUSE_CONTROLS_READY:'true', STRIPE_EXPECTED_ACCOUNT_ID:'acct_live_expected' }, () => {
  const state = releaseState();
  assert.equal(state.productionPaymentWrites, true);
  assert.equal(writeAllowed('payment'), true);
  assert.equal(expectedStripeAccountId(), 'acct_live_expected');
}));

test('production writes remain blocked when distributed abuse controls are not ready', () => withEnv({ NODE_ENV:'production', VERCEL_ENV:'production', PUBLIC_RELEASE_ENABLED:'true', LEGAL_RELEASE_APPROVED:'true', PAYMENTS_RELEASE_APPROVED:'true', PRODUCTION_OPERATIONS_ENABLED:'true', DISTRIBUTED_ABUSE_CONTROLS_READY:'false' }, () => {
  assert.equal(writeAllowed('public'), false);
  assert.equal(writeAllowed('payment'), false);
  assert.equal(writeAllowed('admin'), false);
}));

test('production Stripe account identity must be explicitly configured', () => withEnv({ NODE_ENV:'production', VERCEL_ENV:'production', STRIPE_EXPECTED_ACCOUNT_ID:undefined }, () => {
  assert.throws(() => expectedStripeAccountId(), { code:'STRIPE_EXPECTED_ACCOUNT_NOT_CONFIGURED' });
}));

test('minor-payment remains separately gated', () => withEnv({ NODE_ENV:'production', VERCEL_ENV:'production', PUBLIC_RELEASE_ENABLED:'true', LEGAL_RELEASE_APPROVED:'true', PAYMENTS_RELEASE_APPROVED:'true', DISTRIBUTED_ABUSE_CONTROLS_READY:'true', MINOR_DATA_RELEASE_APPROVED:'false' }, () => {
  assert.equal(writeAllowed('payment'), true);
  assert.equal(writeAllowed('minor-payment'), false);
}));
