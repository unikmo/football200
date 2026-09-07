const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { verifyWebhookSignature } = require('../api/_lib/stripe');

test('Stripe webhook signature verification accepts a valid current signature', () => {
  const body = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' });
  const secret = 'whsec_test';
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  assert.equal(verifyWebhookSignature(body, `t=${timestamp},v1=${digest}`, secret), true);
});

test('Stripe webhook signature verification rejects tampering', () => {
  const body = JSON.stringify({ id: 'evt_test' });
  const secret = 'whsec_test';
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  assert.equal(verifyWebhookSignature(body + 'x', `t=${timestamp},v1=${digest}`, secret), false);
});
