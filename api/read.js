const { sendJson } = require('./_lib/http');

const handlers = Object.freeze({
  'clubs': () => require('../server/clubs'),
  'programme': () => require('../server/programme'),
  'schools': () => require('../server/schools'),
  'health/firebase': () => require('../server/health/firebase'),
  'health/readiness': () => require('../server/health/readiness'),
  'certificates/public': () => require('../server/certificates/public'),
  'public/club-sponsors': () => require('../server/public/club-sponsors'),
  'public/spotlight': () => require('../server/public/spotlight'),
});

function routeFromRequest(req) {
  try { return new URL(req.url, 'http://localhost').searchParams.get('route') || ''; }
  catch { return ''; }
}

module.exports = async function handler(req, res) {
  const route = routeFromRequest(req);
  const load = handlers[route];
  if (!load) return sendJson(res, 404, { ok: false, error: 'READ_ROUTE_NOT_FOUND' });
  return load()(req, res);
};
