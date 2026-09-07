const { sendJson } = require('../_lib/http');
const { getEmailConfigurationStatus } = require('../_lib/email');
module.exports = async function handler(req,res){ if(req.method!=='GET') return sendJson(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'}); return sendJson(res,200,{ok:true,email:getEmailConfigurationStatus()}); };