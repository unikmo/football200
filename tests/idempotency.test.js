const test=require('node:test');const assert=require('node:assert/strict');const {normalizeRequestId,checkoutIdentity}=require('../api/_lib/idempotency');
const id='123e4567-e89b-42d3-a456-426614174000';
test('valid client request ids are normalized',()=>{assert.equal(normalizeRequestId(id.toUpperCase()),id);assert.equal(normalizeRequestId('not-a-uuid'),'')});
test('same request and fingerprint produce the same Stripe idempotency identity',()=>{const a=checkoutIdentity('sponsorship',id,['club-1','fan-pate','a@example.com']);const b=checkoutIdentity('sponsorship',id,['club-1','fan-pate','a@example.com']);assert.equal(a.intentId,b.intentId);assert.equal(a.stripeKey,b.stripeKey)});
test('changed checkout payload changes Stripe idempotency identity',()=>{const a=checkoutIdentity('sponsorship',id,['club-1','fan-pate']);const b=checkoutIdentity('sponsorship',id,['club-1','stadtpartner']);assert.notEqual(a.stripeKey,b.stripeKey)});
