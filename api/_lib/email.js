function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }
function configuration() {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.FOOTBALL200_EMAIL_FROM || '').trim();
  return { configured: Boolean(apiKey && from), fromConfigured: Boolean(from), provider: 'resend', apiKey, from };
}
function getEmailConfigurationStatus() { const c = configuration(); return { configured: c.configured, fromConfigured: c.fromConfigured, provider: c.provider }; }
async function sendCertificateEmail({ to, company, clubName, tierName, certificateUrl, idempotencyKey = '' }) {
  const cfg = configuration();
  if (!cfg.configured) return { ok: false, configured: false };
  const safeCompany = escapeHtml(company), safeClub = escapeHtml(clubName), safeTier = escapeHtml(tierName), safeUrl = escapeHtml(certificateUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    body: JSON.stringify({
      from: cfg.from,
      to: [to],
      subject: `Ihr Football200 Sponsor-Zertifikat · ${tierName}`,
      text: `Vielen Dank für Ihr Sponsoring von ${clubName}. Ihr digitales Football200 Sponsor-Zertifikat für ${company} ist bereit: ${certificateUrl}`,
      html: `<p>Guten Tag,</p><p>vielen Dank für Ihr Sponsoring von <strong>${safeClub}</strong>.</p><p>Ihr digitales Football200 Sponsor-Zertifikat für <strong>${safeCompany}</strong> (${safeTier}) ist bereit:</p><p><a href="${safeUrl}">Zertifikat öffnen</a></p><p>Mit freundlichen Grüßen<br>Football200</p>`,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(body?.message || `Email delivery failed (${response.status})`); error.code = 'EMAIL_DELIVERY_FAILED'; error.status = response.status; throw error; }
  return { ok: true, configured: true, id: body.id || '' };
}
module.exports = { sendCertificateEmail, getEmailConfigurationStatus };