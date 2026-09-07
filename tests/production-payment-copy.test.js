const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'f200-payment-copy-'));fs.mkdirSync(path.join(dir,'scripts'),{recursive:true});fs.mkdirSync(path.join(dir,'sponsor'),{recursive:true});fs.copyFileSync(path.join(root,'scripts/build-public.js'),path.join(dir,'scripts/build-public.js'));fs.copyFileSync(path.join(root,'sponsor/checkout.html'),path.join(dir,'sponsor/checkout.html'));fs.copyFileSync(path.join(root,'family-plus.html'),path.join(dir,'family-plus.html'));fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><html><head><title>T</title></head><body></body></html>');return dir}
function build(dir,extra={}){execFileSync(process.execPath,[path.join(dir,'scripts/build-public.js')],{cwd:dir,env:{...process.env,VERCEL_ENV:'production',PUBLIC_RELEASE_ENABLED:'true',LEGAL_RELEASE_APPROVED:'true',PUBLIC_INDEXING_ENABLED:'true',PAYMENTS_RELEASE_APPROVED:'true',VERCEL_PROJECT_PRODUCTION_URL:'example.test',...extra}})}
test('authorized production sponsor checkout does not retain sandbox copy',()=>{const dir=fixture();build(dir);const html=fs.readFileSync(path.join(dir,'sponsor/checkout.html'),'utf8');assert.match(html,/Sicher bezahlen · Stripe/);assert.doesNotMatch(html,/Stripe Sandbox Checkout · Preview only/);assert.doesNotMatch(html,/Preview\/Sandbox/)});
test('Family Plus live copy stays gated behind minor-data approval',()=>{const blocked=fixture();build(blocked,{MINOR_DATA_RELEASE_APPROVED:'false'});assert.match(fs.readFileSync(path.join(blocked,'family-plus.html'),'utf8'),/Family Plus · Preview/);const live=fixture();build(live,{MINOR_DATA_RELEASE_APPROVED:'true'});const html=fs.readFileSync(path.join(live,'family-plus.html'),'utf8');assert.match(html,/Family Plus · Sicher bezahlen/);assert.doesNotMatch(html,/Im aktuellen Preview/)});
