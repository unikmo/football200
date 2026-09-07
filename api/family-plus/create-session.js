const crypto = require('crypto');
const { sendJson, readJsonBody, text, email, previewWritesAllowed } = require('../_lib/http');
const { stripePost } = require('../_lib/stripe');

function origin(req){const host=req.headers['x-forwarded-host']||req.headers.host;const proto=req.headers['x-forwarded-proto']||'https';return `${proto}://${host}`}

module.exports = async function handler(req,res){
  if(req.method!=='POST') return sendJson(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!previewWritesAllowed()) return sendJson(res,403,{ok:false,error:'PREVIEW_ONLY'});
  try{
    const body=await readJsonBody(req);const passReference=text(body.passReference,120);const guardianEmail=email(body.email);
    if(!passReference||!guardianEmail) return sendJson(res,400,{ok:false,error:'VALIDATION_FAILED'});
    const intentId=crypto.randomUUID();const base=origin(req);
    const params={mode:'payment',locale:'de',customer_email:guardianEmail,client_reference_id:intentId,success_url:`${base}/family-plus/erfolg.html?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${base}/family-plus.html?cancelled=1`,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':'2500','line_items[0][price_data][product_data][name]':'Football200 · Family Plus','line_items[0][price_data][product_data][description]':'Vierter Haushaltsplatz · eine Saison','metadata[product_type]':'family_plus','metadata[pass_reference]':passReference,'metadata[order_intent_id]':intentId,'payment_intent_data[metadata][product_type]':'family_plus','payment_intent_data[metadata][pass_reference]':passReference};
    const session=await stripePost('/checkout/sessions',params,`football200:family-plus:${intentId}`);
    return sendJson(res,201,{ok:true,url:session.url,sessionId:session.id});
  }catch(error){return sendJson(res,500,{ok:false,error:error.code||'FAMILY_PLUS_CHECKOUT_FAILED'})}
};