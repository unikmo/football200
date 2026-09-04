const { getFirebaseConfig, listDocuments } = require('../_lib/firebase');
const { sendJson } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const config = getFirebaseConfig();
    await listDocuments('_health_probe', 1);
    return sendJson(res, 200, {
      ok: true,
      configured: true,
      projectId: config.projectId,
      databaseId: config.databaseId,
      environment: process.env.VERCEL_ENV || 'unknown',
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      configured: error.code !== 'FIREBASE_NOT_CONFIGURED',
      error: error.code || 'FIREBASE_HEALTH_FAILED',
    });
  }
};
