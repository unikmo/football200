const crypto = require('crypto');

function normalizeRequestId(value) {
  const raw = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw) ? raw.toLowerCase() : '';
}

function stableHash(parts) {
  return crypto.createHash('sha256').update(parts.map(v => String(v ?? '')).join('|')).digest('hex');
}

function identityFromDigest(prefix, digest, requestId = '') {
  return { requestId, intentId: `F200I-${digest.slice(0, 24)}`, stripeKey: `football200:${prefix}:${digest}` };
}

function checkoutIdentity(prefix, suppliedRequestId, fingerprintParts = []) {
  const requestId = normalizeRequestId(suppliedRequestId) || crypto.randomUUID();
  return identityFromDigest(prefix, stableHash([prefix, requestId, ...fingerprintParts]), requestId);
}

function productIdentity(prefix, fingerprintParts = []) {
  return identityFromDigest(prefix, stableHash([prefix, ...fingerprintParts]));
}

module.exports = { normalizeRequestId, stableHash, checkoutIdentity, productIdentity };
