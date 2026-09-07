const { listDocuments } = require('./_lib/firebase');
const { sendJson } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const docs = await listDocuments('clubs', 100);
    const clubs = docs
      .filter(club => club.status === 'active')
      .map(({ id, name, city, season, releasedPlaces, sponsoredPlaces, website }) => ({
        id, name, city, season, releasedPlaces, sponsoredPlaces, website,
      }));
    return sendJson(res, 200, { ok: true, clubs });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.code || 'CLUBS_READ_FAILED' });
  }
};
