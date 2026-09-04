const { createDocument } = require('../_lib/firebase');
const { sendJson, readJsonBody, text, email, previewWritesAllowed } = require('../_lib/http');
const { PROGRAMME, normalizeTier } = require('../_lib/programme');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!previewWritesAllowed()) return sendJson(res, 403, { ok: false, error: 'PREVIEW_ONLY' });

  try {
    const body = await readJsonBody(req);
    if (body.website) return sendJson(res, 200, { ok: true });

    const tierKey = normalizeTier(body.level);
    const tier = tierKey ? PROGRAMME.tiers[tierKey] : null;
    const payload = {
      company: text(body.company, 180),
      city: text(body.city, 140),
      contactName: text(body.contactName, 140),
      email: email(body.email),
      level: tierKey,
      levelName: tier?.name || '',
      children: tier?.children || 0,
      amount: tier?.amount || 0,
      preferredClub: text(body.preferredClub, 180),
      addOn: text(body.addOn, 120),
      message: text(body.message, 1500),
      source: 'football200-preview',
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    if (!payload.company || !payload.city || !payload.contactName || !payload.email || !tier) {
      return sendJson(res, 400, { ok: false, error: 'VALIDATION_FAILED' });
    }

    const created = await createDocument('sponsor_interest', payload);
    return sendJson(res, 201, { ok: true, id: created.id, sponsorship: { level: tier.name, children: tier.children, amount: tier.amount } });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.code || 'SPONSOR_INTEREST_WRITE_FAILED' });
  }
};
