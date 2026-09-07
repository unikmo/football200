const { getDocument, updateDocument, createDocument } = require('../_lib/firebase');
const { sendJson, readJsonBody, previewWritesAllowed, text } = require('../_lib/http');
const { sendCertificateEmail } = require('../_lib/email');
const { requireAdmin } = require('../_lib/admin-auth');
module.exports=async function handler(req,res){
  if(!requireAdmin(req,res).ok)return;
  if(req.method!=='POST') return sendJson(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!previewWritesAllowed()) return sendJson(res,403,{ok:false,error:'PREVIEW_ONLY'});
  try{
    const body=await readJsonBody(req), id=text(body.certificateId,120); if(!id) return sendJson(res,400,{ok:false,error:'CERTIFICATE_REQUIRED'});
    const cert=await getDocument('certificates',id); if(!cert) return sendJson(res,404,{ok:false,error:'CERTIFICATE_NOT_FOUND'});
    const proto=req.headers['x-forwarded-proto']||'https',host=req.headers['x-forwarded-host']||req.headers.host; const url=`${proto}://${host}/zertifikat.html?id=${encodeURIComponent(id)}`;
    const delivery=await sendCertificateEmail({to:cert.recipientEmail,company:cert.company||cert.sponsorName,clubName:cert.clubName,tierName:cert.levelName,certificateUrl:url,idempotencyKey:`football200-certificate-${id}`});
    if(!delivery.ok) return sendJson(res,409,{ok:false,error:'EMAIL_NOT_CONFIGURED'});
    const now=new Date().toISOString(); await updateDocument('certificates',id,{status:'sent',deliveryStatus:'sent',sentAt:now,updatedAt:now,emailProviderId:delivery.id}); if(cert.sponsorshipId) await updateDocument('sponsorships',cert.sponsorshipId,{certificateStatus:'sent'}); await createDocument('operations_events',{type:'certificate.sent_manual',certificateId:id,sponsorshipId:cert.sponsorshipId||'',createdAt:now});
    return sendJson(res,200,{ok:true,id,deliveryId:delivery.id});
  }catch(error){return sendJson(res,500,{ok:false,error:error.code||'CERTIFICATE_DELIVERY_FAILED'})}
};