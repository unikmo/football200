const crypto = require('crypto');
const { normalizeHost, deploymentOrigin } = require('./origin');
const COOKIE = '__Host-f200_admin';
const LEGACY_COOKIE = 'f200_admin';
const MAX_AGE_SECONDS = 8 * 60 * 60;

function config(){const password=String(process.env.FOOTBALL200_ADMIN_PASSWORD||'');const secret=String(process.env.FOOTBALL200_ADMIN_SESSION_SECRET||'');return {password,secret,configured:Boolean(password&&secret)}}
function b64(value){return Buffer.from(value).toString('base64url')}
function unb64(value){return Buffer.from(value,'base64url').toString('utf8')}
function sign(value,secret){return crypto.createHmac('sha256',secret).update(value).digest('base64url')}
function safeEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function parseCookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return i<0?[v,'']:[v.slice(0,i),decodeURIComponent(v.slice(i+1))]}))}
function createSession(){const {secret,configured}=config();if(!configured) return '';const payload=JSON.stringify({exp:Math.floor(Date.now()/1000)+MAX_AGE_SECONDS,nonce:crypto.randomBytes(16).toString('hex')});const encoded=b64(payload);return `${encoded}.${sign(encoded,secret)}`}
function verifySession(req){const cfg=config();if(!cfg.configured)return {ok:false,configured:false};const cookies=parseCookies(req);const token=cookies[COOKIE]||cookies[LEGACY_COOKIE]||'';const [payload,sig]=token.split('.');if(!payload||!sig||!safeEqual(sign(payload,cfg.secret),sig))return {ok:false,configured:true};try{const data=JSON.parse(unb64(payload));if(!data.exp||data.exp<Math.floor(Date.now()/1000))return {ok:false,configured:true};return {ok:true,configured:true,exp:data.exp}}catch{return {ok:false,configured:true}}}
function setSessionCookie(res,token){res.setHeader('set-cookie',[`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`,`${LEGACY_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`])}
function clearSessionCookie(res){res.setHeader('set-cookie',[`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,`${LEGACY_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`])}
function verifyPassword(candidate){const cfg=config();if(!cfg.configured)return {ok:false,configured:false};return {ok:safeEqual(candidate,cfg.password),configured:true}}
function isMutation(req){return !['GET','HEAD','OPTIONS'].includes(String(req.method||'GET').toUpperCase())}
function sameOriginRequest(req){
  if(!isMutation(req))return true;
  if(process.env.NODE_ENV==='test')return true;
  const raw=String(req.headers.origin||'').trim();
  if(!raw)return false;
  try{
    const origin=new URL(raw);
    if(origin.protocol!=='https:'&&process.env.VERCEL)return false;
    const originHost=normalizeHost(origin.host);
    const requestHost=normalizeHost(req.headers.host);
    if(originHost&&requestHost&&originHost===requestHost)return true;
    const trusted=new URL(deploymentOrigin(req));
    return originHost===normalizeHost(trusted.host);
  }catch{return false}
}
function rejectOrigin(res){res.statusCode=403;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify({ok:false,error:'ADMIN_ORIGIN_REJECTED'}));return {ok:false,mode:'origin-rejected'}}
function requireAdmin(req,res){
  if(isMutation(req)&&!sameOriginRequest(req))return rejectOrigin(res);
  const state=verifySession(req);
  if(state.ok)return {ok:true,mode:'app-session'};
  if(!state.configured&&process.env.VERCEL_ENV==='preview')return {ok:true,mode:'preview-protection-fallback'};
  res.statusCode=state.configured?401:503;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify({ok:false,error:state.configured?'ADMIN_AUTH_REQUIRED':'ADMIN_AUTH_NOT_CONFIGURED'}));return {ok:false,mode:state.configured?'required':'not-configured'}
}
function authStatus(req){const state=verifySession(req);if(state.ok)return {authenticated:true,configured:true,mode:'app-session',expiresAt:new Date(state.exp*1000).toISOString()};if(!state.configured&&process.env.VERCEL_ENV==='preview')return {authenticated:true,configured:false,mode:'preview-protection-fallback'};return {authenticated:false,configured:state.configured,mode:state.configured?'app-session':'not-configured'}}
module.exports={createSession,setSessionCookie,clearSessionCookie,verifyPassword,requireAdmin,authStatus,sameOriginRequest};
