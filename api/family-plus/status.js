const { getDocument } = require('../_lib/firebase');
const { sendJson } = require('../_lib/http');
const { recordAllowedForEnvironment } = require('../_lib/release');
function query(req,key){try{return new URL(req.url,'http://localhost').searchParams.get(key)||''}catch{return''}}
module.exports=async function handler(req,res){if(req.method!=='GET')return sendJson(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});try{const id=query(req,'session_id').slice(0,220);if(!id)return sendJson(res,400,{ok:false,error:'SESSION_REQUIRED'});let order=await getDocument('family_plus_orders',id);if(order&&!recordAllowedForEnvironment(order))order=null;return sendJson(res,200,{ok:true,paid:Boolean(order&&order.paymentStatus==='paid'),order:order?{passReference:order.passReference,amount:order.amount,currency:order.currency,paidAt:order.paidAt}:null})}catch(error){return sendJson(res,500,{ok:false,error:error.code||'FAMILY_PLUS_STATUS_FAILED'})}};
