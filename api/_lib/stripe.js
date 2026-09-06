const crypto = require('crypto');

const STRIPE_API = 'https://api.stripe.com/v1';

function getStripeSecret() {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) {
    const error = new Error('Stripe secret key is not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }
  if (process.env.VERCEL_ENV === 'preview' && !key.startsWith('sk_test_')) {
    const error = new Error('Preview requires a Stripe test-mode secret key');
    error.code = 'STRIPE_LIVE_KEY_BLOCKED';
    throw error;
  }
  return key;
}

async function stripeGet(path) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${getStripeSecret()}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Stripe request failed (${response.status})`);
    error.code = 'STRIPE_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }
  return body;
}

async function stripePost(path, params, idempotencyKey = '') {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getStripeSecret()}`,
      'content-type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: new URLSearchParams(params),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Stripe request failed (${response.status})`);
    error.code = 'STRIPE_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }
  return body;
}

function verifyWebhookSignature(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  const pieces = String(signatureHeader || '').split(',').map(v => v.trim());
  const timestamp = pieces.find(v => v.startsWith('t='))?.slice(2);
  const signatures = pieces.filter(v => v.startsWith('v1=')).map(v => v.slice(3));
  if (!timestamp || !signatures.length || !secret) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signatures.some(sig => {
    if (sig.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
}

function readRawBody(req, maxBytes = 1024 * 1024) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) return reject(new Error('Request body too large'));
      chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

module.exports = { getStripeSecret, stripeGet, stripePost, verifyWebhookSignature, readRawBody };
