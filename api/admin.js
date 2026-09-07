const { sendJson } = require('./_lib/http');

const handlers = Object.freeze({
  'overview': () => require('../server/admin/overview'),
  'certificate-status': () => require('../server/admin/certificate-status'),
  'certificate-delivery': () => require('../server/admin/certificate-delivery'),
  'child-selection': () => require('../server/admin/child-selection'),
  'email-health': () => require('../server/admin/email-health'),
  'login': () => require('../server/admin/login'),
  'logout': () => require('../server/admin/logout'),
  'schools': () => require('../server/admin/schools'),
  'session': () => require('../server/admin/session'),
  'sponsor-publication': () => require('../server/admin/sponsor-publication'),
  'spotlight': () => require('../server/admin/spotlight'),
});

function routeFromRequest(req) {
  try { return new URL(req.url, 'http://localhost').searchParams.get('route') || ''; }
  catch { return ''; }
}

module.exports = async function handler(req, res) {
  const route = routeFromRequest(req);
  const load = handlers[route];
  if (!load) return sendJson(res, 404, { ok: false, error: 'ADMIN_ROUTE_NOT_FOUND' });
  return load()(req, res);
};
