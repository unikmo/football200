const { createDocument } = require('../_lib/firebase');
const { sendJson, readJsonBody, text, email, previewWritesAllowed } = require('../_lib/http');

const CAPACITY_VALUES = new Set(['50', '100', '150', '200', 'open']);

function normalizeCapacity(value) {
  const raw = text(value, 80).toLowerCase();
  if (raw.includes('200')) return '200';
  if (raw.includes('150')) return '150';
  if (raw.includes('100')) return '100';
  if (raw.includes('50')) return '50';
  return 'open';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!previewWritesAllowed()) return sendJson(res, 403, { ok: false, error: 'PREVIEW_ONLY' });

  try {
    const body = await readJsonBody(req);
    if (body.website) return sendJson(res, 200, { ok: true });

    const payload = {
      clubName: text(body.clubName, 180),
      locationLeague: text(body.locationLeague, 180),
      contactName: text(body.contactName, 140),
      email: email(body.email),
      phone: text(body.phone, 60),
      plannedCapacity: normalizeCapacity(body.plannedCapacity),
      goals: text(body.goals, 1500),
      source: 'football200-preview',
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    if (!payload.clubName || !payload.locationLeague || !payload.contactName || !payload.email || !CAPACITY_VALUES.has(payload.plannedCapacity)) {
      return sendJson(res, 400, { ok: false, error: 'VALIDATION_FAILED' });
    }

    const created = await createDocument('club_interest', payload);
    return sendJson(res, 201, { ok: true, id: created.id });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.code || 'CLUB_INTEREST_WRITE_FAILED' });
  }
};
