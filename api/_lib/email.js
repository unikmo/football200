async function sendCertificateEmail({ to, company, clubName, tierName, certificateUrl }) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.FOOTBALL200_EMAIL_FROM || '').trim();
  if (!apiKey || !from) return { ok: false, configured: false };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Ihr Football200 Sponsor-Zertifikat · ${tierName}`,
      html: `<p>Guten Tag,</p><p>vielen Dank für Ihr Sponsoring von <strong>${clubName}</strong>.</p><p>Ihr digitales Football200 Sponsor-Zertifikat für <strong>${company}</strong> ist bereit:</p><p><a href="${certificateUrl}">Zertifikat öffnen</a></p><p>Mit freundlichen Grüßen<br>Football200</p>`,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || `Email delivery failed (${response.status})`);
    error.code = 'EMAIL_DELIVERY_FAILED';
    throw error;
  }
  return { ok: true, configured: true, id: body.id || '' };
}

module.exports = { sendCertificateEmail };
