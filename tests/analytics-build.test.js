const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sourceScript = path.resolve(__dirname, '../scripts/build-public.js');
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'f200-analytics-'));fs.mkdirSync(path.join(root,'scripts'),{recursive:true});fs.copyFileSync(sourceScript,path.join(root,'scripts/build-public.js'));fs.writeFileSync(path.join(root,'index.html'),'<!doctype html><html><head><title>T</title></head><body><h1>T</h1></body></html>');return root}
function run(root,env){return execFileSync(process.execPath,[path.join(root,'scripts/build-public.js')],{cwd:root,env:{...process.env,...env},encoding:'utf8'})}
test('local event layer is present without enabling third-party analytics',()=>{const root=fixture();const out=run(root,{VERCEL_ENV:'production',PUBLIC_RELEASE_ENABLED:'true',PUBLIC_INDEXING_ENABLED:'true',LEGAL_RELEASE_APPROVED:'true',ANALYTICS_RELEASE_APPROVED:'false',ANALYTICS_CONSENT_READY:'false',VERCEL_PROJECT_PRODUCTION_URL:'example.test'});const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/data-f200-analytics/);assert.doesNotMatch(html,/data-f200-gtm/);assert.match(out,/"analyticsNetworkEnabled":false/)});
test('GTM loads only after analytics approval, consent readiness and valid provider id',()=>{const root=fixture();const out=run(root,{VERCEL_ENV:'production',PUBLIC_RELEASE_ENABLED:'true',PUBLIC_INDEXING_ENABLED:'true',LEGAL_RELEASE_APPROVED:'true',ANALYTICS_RELEASE_APPROVED:'true',ANALYTICS_CONSENT_READY:'true',PUBLIC_GTM_ID:'GTM-ABC123',VERCEL_PROJECT_PRODUCTION_URL:'example.test'});const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/data-f200-gtm/);assert.match(html,/GTM-ABC123/);assert.match(out,/"analyticsNetworkEnabled":true/) });
