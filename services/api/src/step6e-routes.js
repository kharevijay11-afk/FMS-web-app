import {HttpError,sendJson} from './lib/http.js';
import {certificateDocument,idCardDocument} from './step6e-documents.js';
const text=(v,max,name)=>{const x=String(v||'').trim();if(!x||x.length>max)throw new HttpError(422,'VALIDATION_FAILED',`${name} is required and must be at most ${max} characters.`);return x};
const date=v=>{const x=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(x)||Number.isNaN(Date.parse(`${x}T00:00:00Z`)))throw new HttpError(422,'VALIDATION_FAILED','Enter a valid date.');return x};
export async function step6eRoute(req,res,url,id,{repo,auth,allow,csrf,requireSameOrigin,config,json,ipHash}){
 if(!url.pathname.startsWith('/api/v1/admin/step6e'))return false;
 const a=await auth(req);allow(a.user,'system:admin');
 if(!repo.step6eList)throw new HttpError(501,'INTEGRATION_PENDING','Step 6E repository integration is pending.');
 const relative=url.pathname.slice('/api/v1/admin/step6e'.length).replace(/^\//,'');
 if(req.method==='GET'&&!relative){const kind=String(url.searchParams.get('kind')||'notices');if(!['notices','reminders','certificates','id-cards'].includes(kind))throw new HttpError(422,'VALIDATION_FAILED','Unknown Step 6E view.');sendJson(res,200,await repo.step6eList(kind,{asOf:url.searchParams.get('asOf')||new Date().toISOString().slice(0,10)}));return true}
 const document=relative.match(/^(certificates|id-cards)\/([^/]+)\/document$/);
 if(req.method==='GET'&&document){if(!repo.step6eDocument)throw new HttpError(501,'PRINT_LAYOUT_PENDING','Print layout integration is pending.');const kind=document[1]==='certificates'?'certificate':'id-card',model=await repo.step6eDocument(kind,decodeURIComponent(document[2])),html=kind==='certificate'?certificateDocument(model):idCardDocument(model);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(html);return true}
 requireSameOrigin(req,config);csrf(req,a.session);
 const event={actorUserId:a.user.id,actorRole:a.user.role,requestId:id,ipHash:ipHash(req),outcome:'success'},body=await json(req);
 if(req.method==='POST'&&relative==='notices'){const target=body?.target||{},type=String(target.type||'');if(!['active','course','session','students'].includes(type))throw new HttpError(422,'VALIDATION_FAILED','Select a valid notice target.');if(['course','session'].includes(type))target.value=text(target.value,160,'Target');if(type==='students'&&(!Array.isArray(target.studentIds)||!target.studentIds.length||target.studentIds.length>500))throw new HttpError(422,'VALIDATION_FAILED','Select at least one student.');sendJson(res,201,{notice:await repo.step6eCreateNotice({title:text(body.title,160,'Title'),message:text(body.message,2000,'Message'),target:{type,value:target.value,studentIds:target.studentIds}},event)});return true}
 if(req.method==='POST'&&relative==='reminders'){sendJson(res,201,{reminder:await repo.step6eRecordReminder({studentRecordId:text(body.studentRecordId,100,'Student'),asOf:date(body.asOf)},event)});return true}
 if(req.method==='POST'&&relative==='certificates'){sendJson(res,201,{certificate:await repo.step6eIssueCertificate({studentRecordId:text(body.studentRecordId,100,'Student'),type:text(body.type,40,'Certificate type'),issueDate:date(body.issueDate),certificateNumber:text(body.certificateNumber,100,'Certificate number')},event)});return true}
 if(req.method==='POST'&&relative==='id-cards'){sendJson(res,201,{idCard:await repo.step6eIssueIdCard({studentRecordId:text(body.studentRecordId,100,'Student'),issueDate:date(body.issueDate)},event)});return true}
 const print=relative.match(/^id-cards\/([^/]+)\/print$/);if(req.method==='POST'&&print){sendJson(res,200,{idCard:await repo.step6eRecordIdCardPrint(decodeURIComponent(print[1]),event)});return true}
 throw new HttpError(405,'METHOD_NOT_ALLOWED','This Step 6E action is not supported.');
}
