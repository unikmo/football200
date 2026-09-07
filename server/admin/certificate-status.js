const { getDocument, updateDocument, createDocument } = require('../_lib/firebase');
const { sendJson, readJsonBody, text } = require('../_lib/http');
const { normalizeCertificate, normalizeCertificateStatus, canTransitionCertificate } = require('../_lib/admin');
const { requireAdmin } = require('../_lib/admin-auth');
const { writeAllowed, sourceTag } = require('../_lib/release');

function safeDocumentId(value) {
  const id = text(value, 200);
  return /^[A-Za-z0-9_-]{1,200}$/.test(id) ? id : '';
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res).ok) return;
  if (req.method !== 'PATCH') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!writeAllowed('admin')) return sendJson(res, 403, { ok: false, error: 'RELEASE_GATE_BLOCKED' });

  try {
    const body = await readJsonBody(req);
    const id = safeDocumentId(body.id);
    const nextStatus = normalizeCertificateStatus(body.status);
    const note = text(body.note, 500);
    if (!id || !nextStatus) return sendJson(res, 400, { ok: false, error: 'VALIDATION_FAILED' });

    const current = await getDocument('certificates', id);
    if (!current) return sendJson(res, 404, { ok: false, error: 'CERTIFICATE_NOT_FOUND' });

    const currentStatus = normalizeCertificateStatus(current.status) || 'pending';
    if (!canTransitionCertificate(currentStatus, nextStatus)) {
      return sendJson(res, 409, { ok: false, error: 'INVALID_CERTIFICATE_TRANSITION', currentStatus, requestedStatus: nextStatus });
    }

    const now = new Date().toISOString();
    const update = { status: nextStatus, updatedAt: now };
    if (nextStatus === 'generated' && !current.generatedAt) update.generatedAt = now;
    if (nextStatus === 'sent' && !current.sentAt) update.sentAt = now;
    if (nextStatus === 'failed') { update.failedAt = now; update.lastError = note || 'Manual failure status set from admin'; }
    if (nextStatus === 'pending' && currentStatus === 'failed') { update.retryRequestedAt = now; update.lastError = null; }

    const updated = await updateDocument('certificates', id, update);
    const orderId = safeDocumentId(current.orderId || current.sponsorshipId);
    if (orderId) { const order = await getDocument('sponsorships', orderId); if (order) await updateDocument('sponsorships', orderId, { certificateStatus: nextStatus, updatedAt: now }); }
    await createDocument('operations_events', { type: 'certificate_status_changed', entityType: 'certificate', entityId: id, orderId: orderId || '', fromStatus: currentStatus, toStatus: nextStatus, note, source: sourceTag('football200-admin'), createdAt: now });
    return sendJson(res, 200, { ok: true, certificate: normalizeCertificate(updated) });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.code || 'CERTIFICATE_STATUS_UPDATE_FAILED', upstreamStatus: Number.isInteger(error.status) ? error.status : null });
  }
};
