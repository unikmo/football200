const { PROGRAMME } = require('./_lib/programme');
const { sendJson } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  return sendJson(res, 200, { ok: true, programme: PROGRAMME });
};
