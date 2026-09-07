const test=require('node:test');const assert=require('node:assert/strict');
const auth=require('../api/_lib/admin-auth');
function req(method,origin,host='preview.example.test'){return {method,headers:{host,...(origin?{origin}:{})}}}
test('admin same-origin check allows reads and same-origin mutations',()=>{const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{assert.equal(auth.sameOriginRequest(req('GET','https://evil.test')),true);assert.equal(auth.sameOriginRequest(req('POST','https://preview.example.test')),true)}finally{process.env.NODE_ENV=old}});
test('admin same-origin check rejects missing or cross-origin mutation requests',()=>{const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{assert.equal(auth.sameOriginRequest(req('POST','')),false);assert.equal(auth.sameOriginRequest(req('PATCH','https://evil.test')),false)}finally{process.env.NODE_ENV=old}});
