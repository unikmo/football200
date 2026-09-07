const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../vercel.json'),'utf8'));

test('security headers are enforced globally',()=>{
  const headers = Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value]));
  for (const key of ['X-Content-Type-Options','Referrer-Policy','X-Frame-Options','Permissions-Policy','Cross-Origin-Opener-Policy','Strict-Transport-Security','Content-Security-Policy']) assert.ok(headers[key], `missing ${key}`);
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'self'/);
  assert.match(headers['Content-Security-Policy'], /object-src 'none'/);
});

test('readiness endpoint is routed through the existing read gateway',()=>{
  const item=config.rewrites.find(r=>r.source==='/api/health/readiness');
  assert.ok(item);
  assert.equal(item.destination,'/api/read?route=health%2Freadiness');
});
