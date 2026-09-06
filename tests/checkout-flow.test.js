const test = require('node:test');
const assert = require('node:assert/strict');
const { PROGRAMME, normalizeTier } = require('../api/_lib/programme');

test('checkout tiers remain canonical and non-discounted', () => {
  const expected = {
    'fan-pate': [1, 99],
    vereinsfreund: [3, 297],
    jugendfoerderer: [5, 495],
    stadtpartner: [10, 990],
  };
  for (const [key, values] of Object.entries(expected)) {
    assert.deepEqual([PROGRAMME.tiers[key].children, PROGRAMME.tiers[key].amount], values);
    assert.equal(normalizeTier(key), key);
  }
});
