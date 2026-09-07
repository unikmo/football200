const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiRoot = path.resolve(__dirname, '../api');

function entrypoints(dir, relative = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (rel === '_lib' || rel.startsWith('_lib/')) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entrypoints(full, rel);
    return entry.isFile() && entry.name.endsWith('.js') ? [rel] : [];
  });
}

test('Vercel Hobby function budget stays at or below 12 entrypoints', () => {
  const functions = entrypoints(apiRoot).sort();
  assert.ok(functions.length <= 12, `Expected <=12 API functions, found ${functions.length}: ${functions.join(', ')}`);
});
