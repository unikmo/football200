const crypto=require('crypto');
const {listAllDocuments,createDocument}=require('../_lib/firebase');
const {sendJson,readJsonBody,text}=require('../_lib/http');
const {requireAdmin}=require('../_lib/admin-auth');
const {writeAllowed,releaseState,sourceTag}=require('../_lib/release');

module.exports=async function handler(req,res){
  if(!requireAdmin(req,res).ok)return;
  if(req.method==='GET'){
    try{return sendJson(res,200,{ok:true,schools:await listAllDocuments('schools')})}
    catch(error){return sendJson(res,500,{ok:false,error:error.code||'SCHOOLS_LIST_FAILED'})}
  }
  if(req.method!=='POST')return sendJson(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!writeAllowed('admin'))return sendJson(res,403,{ok:false,error:'RELEASE_GATE_BLOCKED'});
  try{
    const body=await readJsonBody(req),name=text(body.name,180),city=text(body.city,140);
    if(!name||!city)return sendJson(res,400,{ok:false,error:'VALIDATION_FAILED'});
    const code=`SCH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,now=new Date().toISOString();
    const created=await createDocument('schools',{name,city,code,status:'active',syntheticTest:!releaseState().production,source:sourceTag('football200-admin'),createdAt:now,updatedAt:now});
    return sendJson(res,201,{ok:true,id:created.id,code})
  }catch(error){return sendJson(res,500,{ok:false,error:error.code||'SCHOOL_CREATE_FAILED'})}
};
