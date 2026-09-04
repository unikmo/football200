const { sendJson } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  return sendJson(res, 409, {
    ok: false,
    error: 'PERSISTENCE_DISABLED_IN_DEMO',
    message: 'Child application persistence remains disabled until the production consent, privacy and safeguarding workflow has been approved.',
  });
};
