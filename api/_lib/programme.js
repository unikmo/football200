const PROGRAMME = Object.freeze({
  name: 'Sponsor a Young Fan',
  market: 'Germany',
  currency: 'EUR',
  unitPrice: 99,
  clubSeasonCap: 200,
  tiers: Object.freeze({
    'fan-pate': Object.freeze({ name: 'Fan-Pate', children: 1, amount: 99 }),
    vereinsfreund: Object.freeze({ name: 'Vereinsfreund', children: 3, amount: 297 }),
    jugendfoerderer: Object.freeze({ name: 'Jugendförderer', children: 5, amount: 495 }),
    stadtpartner: Object.freeze({ name: 'Stadtpartner', children: 10, amount: 990 }),
  }),
  familyPlus: 25,
});

function normalizeTier(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('stadtpartner') || raw.includes('10')) return 'stadtpartner';
  if (raw.includes('jugend') || raw.includes('5')) return 'jugendfoerderer';
  if (raw.includes('vereinsfreund') || raw.includes('3')) return 'vereinsfreund';
  if (raw.includes('fan-pate') || raw.includes('fan pate') || raw.includes('1')) return 'fan-pate';
  return null;
}

module.exports = { PROGRAMME, normalizeTier };
