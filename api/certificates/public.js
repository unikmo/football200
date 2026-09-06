const { getDocument } = require('../_lib/firebase');
const { sendJson, text } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const id = text(req.query?.id, 100);
    if (!/^[a-f0-9]{32}$/.test(id)) return sendJson(res, 400, { ok: false, error: 'INVALID_CERTIFICATE_ID' });
    const cert = await getDocument('certificates', id);
    if (!cert || !['generated', 'sent'].includes(cert.status)) return sendJson(res, 404, { ok: false, error: 'CERTIFICATE_NOT_FOUND' });
    const { company, city, clubName, season, levelName, children, status, generatedAt, sentAt } = cert;
    return sendJson(res, 200, { ok: true, certificate: { id, company, city, clubName, season, levelName, children, status, generatedAt, sentAt } });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.code || 'CERTIFICATE_READ_FAILED' });
  }
};
