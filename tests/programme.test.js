const test = require('node:test');
const assert = require('node:assert/strict');
const { PROGRAMME, normalizeTier } = require('../api/_lib/programme');
const { encodeFields, decodeFields } = require('../api/_lib/firebase');

test('canonical sponsorship economics stay fixed', () => {
  assert.equal(PROGRAMME.unitPrice, 99);
  assert.equal(PROGRAMME.clubSeasonCap, 200);
  assert.deepEqual(
    Object.values(PROGRAMME.tiers).map(t => [t.children, t.amount]),
    [[1, 99], [3, 297], [5, 495], [10, 990]],
  );
});

test('tier normalization maps existing German form labels', () => {
  assert.equal(normalizeTier('Fan-Pate · 1 Kind · 99 €'), 'fan-pate');
  assert.equal(normalizeTier('Vereinsfreund · 3 Kinder · 297 €'), 'vereinsfreund');
  assert.equal(normalizeTier('Jugendförderer · 5 Kinder · 495 €'), 'jugendfoerderer');
  assert.equal(normalizeTier('Stadtpartner · 10 Kinder · 990 €'), 'stadtpartner');
});

test('Firestore field codec round-trips supported values', () => {
  const input = { name: 'Test', active: true, count: 3, price: 99.5, tags: ['a', 'b'], nested: { city: 'Köln' }, empty: null };
  assert.deepEqual(decodeFields(encodeFields(input)), input);
});
