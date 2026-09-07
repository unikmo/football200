const { createDocument, getDocument, listAllDocuments } = require('./_lib/firebase');
const { sendJson, readJsonBody, text, previewWritesAllowed } = require('./_lib/http');
const { enforceRateLimit } = require('./_lib/rate-limit');
const AGE_BANDS=new Set(['6-8','9-11','12-14','15-17']);
async function validateSchool(code){if(!code)return null;const schools=await listAllDocuments('schools');return schools.find(s=>s.status==='active'&&String(s.code||'').toLowerCase()===String(code).toLowerCase())||null}
module.exports=async function handler(req,res){
 if(req.method!=='POST')return sendJson(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 if(!previewWritesAllowed())return sendJson(res,403,{ok:false,error:'PREVIEW_ONLY'});
 if(!enforceRateLimit(req,res,{bucket:'child-application',limit:6,windowMs:20*60*1000}))return;
 try{const body=await readJsonBody(req);if(body.website)return sendJson(res,200,{ok:true});if(body.syntheticTest!==true)return sendJson(res,409,{ok:false,error:'REAL_CHILD_DATA_LEGAL_GATE'});
 const applicantAlias=text(body.applicantAlias,80),ageBand=text(body.ageBand,20),clubId=text(body.clubId,180),channel=text(body.channel,20).toLowerCase()||'online',schoolCode=text(body.schoolCode,60),motivation=text(body.motivation,600);
 if(!applicantAlias||!AGE_BANDS.has(ageBand)||!clubId||!['online','school'].includes(channel))return sendJson(res,400,{ok:false,error:'VALIDATION_FAILED'});
 const club=await getDocument('clubs',clubId);if(!club||club.status!=='active')return sendJson(res,409,{ok:false,error:'CLUB_NOT_AVAILABLE'});
 let school=null;if(channel==='school'){school=await validateSchool(schoolCode);if(!school)return sendJson(res,409,{ok:false,error:'SCHOOL_CODE_INVALID'});}
 const now=new Date().toISOString();const created=await createDocument('child_applications',{applicantAlias,ageBand,clubId,clubName:club.name||'',channel,schoolId:school?.id||'',schoolName:school?.name||'',motivation,status:'submitted',syntheticTest:true,source:'football200-preview',createdAt:now,updatedAt:now});
 return sendJson(res,201,{ok:true,id:created.id,status:'submitted'});
 }catch(error){return sendJson(res,500,{ok:false,error:error.code||'CHILD_APPLICATION_FAILED'})}
};