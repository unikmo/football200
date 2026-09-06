const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeAdminData, normalizeCertificateStatus, canTransitionCertificate } = require('../api/_lib/admin');

test('admin summary counts only paid orders as revenue and sponsored children', () => {
  const result = summarizeAdminData({
    orders: [
      { id: 'o1', company: 'A', amount: 297, children: 3, paymentStatus: 'paid', createdAt: '2026-09-06T10:00:00Z' },
      { id: 'o2', company: 'B', amount: 99, children: 1, paymentStatus: 'pending', createdAt: '2026-09-06T11:00:00Z' },
    ],
    certificates: [
      { id: 'c1', status: 'generated' },
      { id: 'c2', status: 'failed' },
      { id: 'c3', status: 'sent' },
    ],
    sponsorLeads: [{ id: 's1', status: 'new' }],
    clubLeads: [{ id: 'v1', status: 'new' }],
  });
  assert.equal(result.summary.orders, 2);
  assert.equal(result.summary.paidRevenue, 297);
  assert.equal(result.summary.sponsoredChildren, 3);
  assert.equal(result.summary.certificates.generated, 1);
  assert.equal(result.summary.certificates.failed, 1);
  assert.equal(result.summary.certificates.sent, 1);
  assert.equal(result.summary.attention, 4);
});

test('certificate status normalization is strict', () => {
  assert.equal(normalizeCertificateStatus(' SENT '), 'sent');
  assert.equal(normalizeCertificateStatus('unknown'), '');
});

test('certificate state machine prevents destructive backwards transitions', () => {
  assert.equal(canTransitionCertificate('pending', 'generated'), true);
  assert.equal(canTransitionCertificate('generated', 'sent'), true);
  assert.equal(canTransitionCertificate('failed', 'pending'), true);
  assert.equal(canTransitionCertificate('sent', 'pending'), false);
  assert.equal(canTransitionCertificate('pending', 'sent'), false);
});
