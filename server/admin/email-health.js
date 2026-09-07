const { sendJson } = require('../_lib/http');
const { getEmailConfigurationStatus } = require('../_lib/email');
const { requireAdmin } = require('../_lib/admin-auth');
module.exports = async function handler(req,res){ if(!requireAdmin(req,res).ok)return; if(req.method!=='GET') return sendJson(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'}); return sendJson(res,200,{ok:true,email:getEmailConfigurationStatus()}); };