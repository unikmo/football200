const crypto = require('crypto');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function normalizePrivateKey(value) {
  return String(value || '').trim().replace(/\\n/g, '\n');
}

function parsePrivateKeyInput(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  let candidate = raw;

  // Accept a raw PEM or raw service-account JSON as well as the documented
  // base64-encoded PEM/JSON form. This keeps the server-side secret flexible
  // without ever exposing it to browser code.
  if (!raw.includes('PRIVATE KEY') && !raw.startsWith('{')) {
    try {
      candidate = Buffer.from(raw, 'base64').toString('utf8').trim();
    } catch (cause) {
      const error = new Error('Firebase private key could not be decoded');
      error.code = 'FIREBASE_KEY_INVALID';
      error.cause = cause;
      throw error;
    }
  }

  if (candidate.startsWith('{')) {
    try {
      const json = JSON.parse(candidate);
      candidate = json.private_key || json.privateKey || '';
    } catch (cause) {
      const error = new Error('Firebase service-account JSON could not be parsed');
      error.code = 'FIREBASE_KEY_INVALID';
      error.cause = cause;
      throw error;
    }
  }

  const privateKey = normalizePrivateKey(candidate);
  if (!privateKey || !privateKey.includes('PRIVATE KEY')) {
    const error = new Error('Firebase private key is not a PEM private key');
    error.code = 'FIREBASE_KEY_INVALID';
    throw error;
  }

  return privateKey;
}

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const keyInput = process.env.FIREBASE_PRIVATE_KEY_BASE64;

  if (!projectId || !clientEmail || !keyInput) {
    const error = new Error('Firebase server credentials are incomplete');
    error.code = 'FIREBASE_NOT_CONFIGURED';
    throw error;
  }

  const privateKey = parsePrivateKeyInput(keyInput);
  return { projectId, databaseId, clientEmail, privateKey };
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExpiresAt - 60 > now) return cachedToken;

  const { clientEmail, privateKey } = getFirebaseConfig();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: clientEmail,
    sub: clientEmail,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
    scope: FIRESTORE_SCOPE,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    const error = new Error('Firebase OAuth token request failed');
    error.code = 'FIREBASE_AUTH_FAILED';
    error.status = response.status;
    throw error;
  }

  cachedToken = body.access_token;
  cachedTokenExpiresAt = now + Number(body.expires_in || 3600);
  return cachedToken;
}

function firestoreBaseUrl() {
  const { projectId, databaseId } = getFirebaseConfig();
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [key, nested] of Object.entries(value)) fields[key] = encodeValue(nested);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function decodeValue(value = {}) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  return null;
}

function encodeFields(object) {
  const fields = {};
  for (const [key, value] of Object.entries(object || {})) fields[key] = encodeValue(value);
  return fields;
}

function decodeFields(fields = {}) {
  const object = {};
  for (const [key, value] of Object.entries(fields)) object[key] = decodeValue(value);
  return object;
}

function decodeDocument(document) {
  if (!document) return null;
  const path = document.name || '';
  return {
    id: path.split('/').pop(),
    ...decodeFields(document.fields || {}),
    _createTime: document.createTime || null,
    _updateTime: document.updateTime || null,
  };
}

async function firestoreRequest(path = '', options = {}) {
  const token = await getAccessToken();
  const url = `${firestoreBaseUrl()}${path ? `/${path}` : ''}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Firestore request failed (${response.status})`);
    error.code = 'FIRESTORE_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }
  return body;
}

function safeCollection(collection) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(collection)) throw new Error('Invalid Firestore collection name');
  return collection;
}

async function listDocuments(collection, pageSize = 20) {
  const safe = safeCollection(collection);
  const size = Math.max(1, Math.min(Number(pageSize) || 20, 100));
  const body = await firestoreRequest(`${safe}?pageSize=${size}`);
  return (body.documents || []).map(decodeDocument);
}

async function getDocument(collection, documentId) {
  const safe = safeCollection(collection);
  const id = encodeURIComponent(String(documentId));
  try {
    const body = await firestoreRequest(`${safe}/${id}`);
    return decodeDocument(body);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function createDocument(collection, data, documentId) {
  const safe = safeCollection(collection);
  const query = documentId ? `?documentId=${encodeURIComponent(String(documentId))}` : '';
  const body = await firestoreRequest(`${safe}${query}`, {
    method: 'POST',
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  return decodeDocument(body);
}

module.exports = {
  getFirebaseConfig,
  getAccessToken,
  encodeValue,
  decodeValue,
  encodeFields,
  decodeFields,
  decodeDocument,
  listDocuments,
  getDocument,
  createDocument,
};
