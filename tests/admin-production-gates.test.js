const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const adminProductionFiles=['certificate-delivery.js','certificate-status.js','sponsor-publication.js','spotlight.js','schools.js'];

test('non-minor admin mutations use explicit production operations gate',()=>{
  for(const file of adminProductionFiles){
    const src=fs.readFileSync(path.resolve(__dirname,'../server/admin',file),'utf8');
    assert.match(src,/writeAllowed\(['"]admin['"]\)/,`${file} missing admin release gate`);
    assert.doesNotMatch(src,/previewWritesAllowed/,`${file} still preview-only`);
  }
});

test('child selection remains synthetic-only and preview-gated until minor workflow is legally cleared',()=>{
  const src=fs.readFileSync(path.resolve(__dirname,'../server/admin/child-selection.js'),'utf8');
  assert.match(src,/previewWritesAllowed/);
  assert.match(src,/syntheticTest!==true/);
});
