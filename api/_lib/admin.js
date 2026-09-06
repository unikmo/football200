const CERTIFICATE_STATUSES = ['pending', 'generated', 'sent', 'failed'];
const CERTIFICATE_TRANSITIONS = Object.freeze({
  pending: ['generated', 'failed'],
  generated: ['sent', 'failed'],
  failed: ['pending'],
  sent: ['sent'],
});

function value(value, fallback = '') {
  return value === undefined || value === null ? fallback : value;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function lower(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
}

function dateValue(document) {
  return value(document.createdAt, value(document._createTime, ''));
}

function sortNewest(items) {
  return [...items].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function normalizeOrder(document = {}) {
  return {
    id: String(value(document.id)),
    orderNumber: String(value(document.orderNumber, value(document.orderId, value(document.id)))),
    company: String(value(document.company, value(document.sponsorName))),
    city: String(value(document.city)),
    contactName: String(value(document.contactName)),
    email: String(value(document.email, value(document.sponsorEmail))),
    club: String(value(document.clubName, value(document.club, value(document.preferredClub)))),
    level: String(value(document.levelName, value(document.level))),
    children: number(document.children),
    amount: number(document.amount),
    paymentStatus: lower(document.paymentStatus, lower(document.status, 'pending')),
    certificateStatus: lower(document.certificateStatus),
    createdAt: String(dateValue(document)),
    paidAt: String(value(document.paidAt)),
  };
}

function normalizeCertificate(document = {}) {
  return {
    id: String(value(document.id)),
    orderId: String(value(document.orderId, value(document.sponsorshipId))),
    company: String(value(document.company, value(document.sponsorName))),
    club: String(value(document.clubName, value(document.club))),
    level: String(value(document.levelName, value(document.level))),
    children: number(document.children),
    season: String(value(document.season)),
    recipientEmail: String(value(document.recipientEmail, value(document.email))),
    status: normalizeCertificateStatus(document.status) || 'pending',
    createdAt: String(dateValue(document)),
    generatedAt: String(value(document.generatedAt)),
    sentAt: String(value(document.sentAt)),
    failedAt: String(value(document.failedAt)),
    lastError: String(value(document.lastError)),
    updatedAt: String(value(document.updatedAt, value(document._updateTime))),
  };
}

function normalizeLead(document = {}, type) {
  const common = {
    id: String(value(document.id)),
    type,
    status: lower(document.status, 'new'),
    createdAt: String(dateValue(document)),
  };
  if (type === 'sponsor') {
    return {
      ...common,
      name: String(value(document.company)),
      city: String(value(document.city)),
      contactName: String(value(document.contactName)),
      email: String(value(document.email)),
      club: String(value(document.preferredClub)),
      level: String(value(document.levelName, value(document.level))),
      children: number(document.children),
      amount: number(document.amount),
    };
  }
  return {
    ...common,
    name: String(value(document.clubName)),
    city: String(value(document.locationLeague)),
    contactName: String(value(document.contactName)),
    email: String(value(document.email)),
    plannedCapacity: number(document.plannedCapacity),
  };
}

function normalizeClub(document = {}) {
  const capacity = number(document.releasedCapacity, number(document.capacity, number(document.seasonCapacity)));
  const sponsored = number(document.sponsored, number(document.sponsoredPlaces));
  return {
    id: String(value(document.id)),
    name: String(value(document.name, value(document.clubName))),
    city: String(value(document.city, value(document.location))),
    season: String(value(document.season)),
    status: lower(document.status, 'unknown'),
    capacity,
    sponsored,
    remaining: Math.max(0, number(document.remaining, capacity - sponsored)),
    createdAt: String(dateValue(document)),
  };
}

function normalizeCertificateStatus(status) {
  const normalized = lower(status);
  return CERTIFICATE_STATUSES.includes(normalized) ? normalized : '';
}

function canTransitionCertificate(fromStatus, toStatus) {
  const from = normalizeCertificateStatus(fromStatus) || 'pending';
  const to = normalizeCertificateStatus(toStatus);
  return Boolean(to && (CERTIFICATE_TRANSITIONS[from] || []).includes(to));
}

function summarizeAdminData({ orders = [], certificates = [], sponsorLeads = [], clubLeads = [], clubs = [] } = {}) {
  const normalizedOrders = sortNewest(orders.map(normalizeOrder));
  const normalizedCertificates = sortNewest(certificates.map(normalizeCertificate));
  const normalizedSponsorLeads = sortNewest(sponsorLeads.map(item => normalizeLead(item, 'sponsor')));
  const normalizedClubLeads = sortNewest(clubLeads.map(item => normalizeLead(item, 'club')));
  const normalizedClubs = sortNewest(clubs.map(normalizeClub));

  const paidOrders = normalizedOrders.filter(order => ['paid', 'succeeded', 'complete', 'completed'].includes(order.paymentStatus));
  const certificateCounts = normalizedCertificates.reduce((counts, certificate) => {
    counts[certificate.status] = (counts[certificate.status] || 0) + 1;
    return counts;
  }, { pending: 0, generated: 0, sent: 0, failed: 0 });
  const newSponsorLeads = normalizedSponsorLeads.filter(lead => lead.status === 'new').length;
  const newClubLeads = normalizedClubLeads.filter(lead => lead.status === 'new').length;

  return {
    summary: {
      orders: normalizedOrders.length,
      paidOrders: paidOrders.length,
      paidRevenue: paidOrders.reduce((sum, order) => sum + order.amount, 0),
      sponsoredChildren: paidOrders.reduce((sum, order) => sum + order.children, 0),
      certificates: certificateCounts,
      newSponsorLeads,
      newClubLeads,
      activeClubs: normalizedClubs.filter(club => club.status === 'active').length,
      attention: certificateCounts.pending + certificateCounts.generated + certificateCounts.failed + newSponsorLeads + newClubLeads,
    },
    orders: normalizedOrders,
    certificates: normalizedCertificates,
    sponsorLeads: normalizedSponsorLeads,
    clubLeads: normalizedClubLeads,
    clubs: normalizedClubs,
  };
}

module.exports = {
  CERTIFICATE_STATUSES,
  CERTIFICATE_TRANSITIONS,
  normalizeOrder,
  normalizeCertificate,
  normalizeLead,
  normalizeClub,
  normalizeCertificateStatus,
  canTransitionCertificate,
  summarizeAdminData,
};
