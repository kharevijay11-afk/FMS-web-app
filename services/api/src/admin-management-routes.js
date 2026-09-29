import {HttpError,sendJson} from './lib/http.js';
import {listOptions,validateManagementPatch} from '../../../packages/contracts/src/admin-management.js';
const pick=(r,fields)=>Object.fromEntries(fields.filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
const inquiryFields=['id','inquiryNo','name','mobile','course','message','status','version','createdAt','updatedAt','studentRecordId'];
const studentFields=['id','studentId','name','mobile','email','address','course','session','batch','admissionDate','courseEndDate','status','version','createdAt','updatedAt','fee','guardian','motherName','courseId','courseCode','inquiryId','cvruRegNo','abcId','debId','addonEnabled','courseFeePaise','discountPaise','addonFeePaise','installments'];
export async function adminManagementRoute(req,res,url,id,{repo,auth,allow,csrf,requireSameOrigin,config,json,ipHash}){
  const match=url.pathname.match(/^\/api\/v1\/admin\/(inquiries|students|admissions)(?:\/([^/]+))?(?:\/(convert|mark-left))?$/);
  if(!match)return false;
  const [,resource,encoded,action]=match,type=resource==='admissions'?'students':resource,recordId=encoded?decodeURIComponent(encoded):null;
  const a=await auth(req);allow(a.user,type==='inquiries'?'inquiry:read':'student:summary:read:any');
  if(resource==='admissions')allow(a.user,'system:admin');
  if(!repo.managementList)throw new HttpError(501,'INTEGRATION_PENDING','Management repository integration is pending.');
  const safe=r=>pick(r,type==='inquiries'?inquiryFields:studentFields);
  if(req.method==='GET'&&resource==='admissions'&&recordId==='setup'){sendJson(res,200,await repo.admissionReferences());return true;}
  if(req.method==='GET'&&!recordId){const parsed=listOptions(url.searchParams,type);if(!parsed.ok)throw new HttpError(422,'VALIDATION_FAILED','List filters are invalid.',parsed.errors);const data=await repo.managementList(type,parsed.value);sendJson(res,200,{...data,items:data.items.map(safe),...(resource==='admissions'?{creationAvailable:true,message:'Create an admission with the existing FMS numbering and setup rules.'}:{})});return true;}
  if(req.method==='GET'&&recordId&&!action){const row=await repo.managementGet(type,recordId);if(!row)throw new HttpError(404,'NOT_FOUND','Record was not found.');const data=safe(row);if(a.user.role==='admin'&&repo.managementHistory)data.history=await repo.managementHistory(type,recordId);if(type==='students'&&a.user.role==='admin'&&repo.getStudentPortal){const portal=await repo.getStudentPortal(recordId);if(portal){data.payments=(portal.payments||[]).slice(-5).map(p=>pick(p,['receiptNumber','date','amountPaise','status']));data.notices=(portal.notices||[]).map(n=>pick(n,['title','date','readAt']));data.certificates=(portal.certificates||[]).map(c=>pick(c,['type','eligibility','issued']));}}sendJson(res,200,{[type==='inquiries'?'inquiry':'student']:data});return true;}
  if(!['PATCH','POST'].includes(req.method))throw new HttpError(405,'METHOD_NOT_ALLOWED','This action is not supported.');
  requireSameOrigin(req,config);csrf(req,a.session);
  if(action==='convert'||resource==='admissions'){
    allow(a.user,'system:admin');if(req.method!=='POST'||(resource==='admissions'&&recordId)||(action==='convert'&&type!=='inquiries'))throw new HttpError(405,'METHOD_NOT_ALLOWED','Unsupported admission action.');
    const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw new HttpError(422,'IDEMPOTENCY_KEY_REQUIRED','Supply a stable Idempotency-Key (16–100 characters) for retries.');
    const result=await repo.admissionCreate(await json(req),{inquiryId:action==='convert'?recordId:null,key:a.user.id+':'+key,event:{actorUserId:a.user.id,actorRole:a.user.role,requestId:id,ipHash:ipHash(req),outcome:'success'}});
    sendJson(res,result.replayed?200:201,{...result,student:pick(result.student,studentFields)});return true;
  }
  if(!recordId)throw new HttpError(405,'METHOD_NOT_ALLOWED','Use the existing inquiry creation workflow.');
  allow(a.user,type==='inquiries'?'inquiry:update':'system:admin');
  let parsed;const body=await json(req);
  if(action==='mark-left'&&type==='students'&&req.method==='POST'){
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='version')||!Number.isSafeInteger(body.version)||body.version<1)throw new HttpError(422,'VALIDATION_FAILED','Only a valid record version is required.');
    const row=await repo.managementGet(type,recordId);if(!row)throw new HttpError(404,'NOT_FOUND','Student was not found.');
    if(row.status==='left'){sendJson(res,200,{student:safe(row),unchanged:true});return true;}
    parsed={ok:true,value:{status:'left'},version:body.version};
  }else if(req.method==='PATCH'&&!action)parsed=validateManagementPatch(body,type);
  else throw new HttpError(405,'METHOD_NOT_ALLOWED','This action is not supported.');
  if(!parsed.ok)throw new HttpError(422,'VALIDATION_FAILED','Check the highlighted fields.',parsed.errors);
  const event={actorUserId:a.user.id,actorRole:a.user.role,action:action==='mark-left'?'STUDENT_MARK_LEFT':type==='inquiries'?(Object.keys(parsed.value).length===1&&parsed.value.status?'INQUIRY_STATUS_UPDATE':'INQUIRY_EDIT'):'STUDENT_EDIT',entityType:type==='inquiries'?'inquiry':'student',entityId:recordId,requestId:id,ipHash:ipHash(req),outcome:'success'};
  const row=await repo.managementUpdate(type,recordId,parsed.value,parsed.version,event);
  sendJson(res,200,{[type==='inquiries'?'inquiry':'student']:safe(row)});return true;
}
