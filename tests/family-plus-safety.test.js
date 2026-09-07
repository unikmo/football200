const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const webhook=fs.readFileSync(path.resolve(__dirname,'../api/stripe/webhook.js'),'utf8');
const checkout=fs.readFileSync(path.resolve(__dirname,'../api/family-plus/create-session.js'),'utf8');
test('Family Plus webhook has the stricter minor-payment release gate',()=>{assert.match(webhook,/product_type\s*===\s*['"]family_plus['"][\s\S]*writeAllowed\(['"]minor-payment['"]\)/)});
test('Family Plus checkout revalidates confirmation and rejects already-active pass',()=>{assert.match(checkout,/guardian_confirmations/);assert.match(checkout,/family_plus_orders/);assert.match(checkout,/FAMILY_PLUS_ALREADY_ACTIVE/);assert.match(checkout,/productIdentity\(['"]family-plus['"]/)});
