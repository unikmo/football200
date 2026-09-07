const { getDocument, listAllDocuments } = require('../_lib/firebase');
const { sendJson } = require('../_lib/http');

function query(req, key) {
  try { return new URL(req.url, 'http://localhost').searchParams.get(key) || ''; } catch { return ''; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const clubId = String(query(req, 'clubId')).trim().slice(0, 180);
    if (!clubId) return sendJson(res, 400, { ok: false, error: 'CLUB_REQUIRED' });
    const club = await getDocument('clubs', clubId);
    if (!club || club.status !== 'active') return sendJson(res, 404, { ok: false, error: 'CLUB_NOT_FOUND' });

    const sponsorships = (await listAllDocuments('sponsorships'))
      .filter(item => item.clubId === clubId && item.paymentStatus === 'paid')
      .filter(item => item.publicListingConsent === true && item.publicListingApproved === true)
      .map(item => ({
        company: String(item.company || item.sponsorName || ''),
        city: String(item.city || ''),
        website: String(item.website || ''),
        levelName: String(item.levelName || item.level || ''),
        children: Number(item.children || 0),
        season: String(item.season || club.season || ''),
      }))
      .filter(item => item.company)
      .sort((a, b) => b.children - a.children || a.company.localeCompare(b.company, 'de'));

    const released = Number(club.releasedPlaces || 0);
    const sponsored = Number(club.sponsoredPlaces || 0);
    return sendJson(res, 200, {
      ok: true,
      club: {
        id: club.id,
        name: String(club.name || ''),
        city: String(club.city || ''),
        season: String(club.season || ''),
        releasedPlaces: released,
        sponsoredPlaces: sponsored,
        remainingPlaces: Math.max(0, released - sponsored),
      },
      sponsors: sponsorships,
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.code || 'PUBLIC_SPONSORS_READ_FAILED' });
  }
};