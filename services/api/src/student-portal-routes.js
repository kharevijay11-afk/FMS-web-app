import { HttpError, sendJson } from './lib/http.js';
// Only explicit own-session routes. No ownership parameter comes from the browser.
export async function studentPortalRoute(req,res,url,id,{repo,auth,csrf,requireSameOrigin,config,audit}) {
 const prefix='/api/v1/students/me/';
 if(!url.pathname.startsWith(prefix)) return false;
 const name=url.pathname.slice(prefix.length);
 if(name==='summary') return false; // Existing endpoint remains authoritative and unchanged.
 const a=await auth(req);
 if(a.user.role!=='student'||!a.user.studentRecordId) throw new HttpError(403,'FORBIDDEN','A student account is required.');
 if(url.search) throw new HttpError(400,'UNSUPPORTED_QUERY','Student-owned routes do not accept ownership or filter parameters.');
 const student=await repo.findStudent(a.user.studentRecordId);
 if(!student) throw new HttpError(404,'STUDENT_NOT_FOUND','Student record is unavailable.');
 if(name==='portal'&&req.method==='GET') {
  const portal=repo.getStudentPortal?await repo.getStudentPortal(a.user.studentRecordId):null;
  return sendJson(res,200,{portal:portal||{source:repo.kind,status:'pending',message:'Extended student records are not integrated for this data source.'}}),true;
 }
 const notice=name.match(/^notices\/([A-Za-z0-9_-]{1,100})\/read$/);
 if(notice&&req.method==='POST') {
  requireSameOrigin(req,config);csrf(req,a.session);
  if(!repo.markStudentNoticeRead) throw new HttpError(501,'INTEGRATION_PENDING','Notice persistence integration is pending.');
  const result=await repo.markStudentNoticeRead(a.user.studentRecordId,notice[1]);
  if(!result)throw new HttpError(404,'NOTICE_NOT_FOUND','Notice is unavailable.');
  if(result.changed)await audit(req,id,{actorUserId:a.user.id,actorRole:a.user.role,action:'STUDENT_NOTICE_READ',entityType:'student_notice',entityId:notice[1],outcome:'success'});
  return sendJson(res,200,{notice:result.notice}),true;
 }
 const receipt=name.match(/^receipts\/([A-Za-z0-9_-]{1,100})\/document$/);
 if(receipt&&req.method==='GET') {
  const portal=repo.getStudentPortal?await repo.getStudentPortal(a.user.studentRecordId):null;
  if(!portal?.receipts.some(item=>item.id===receipt[1]))throw new HttpError(404,'RECEIPT_NOT_FOUND','Receipt is unavailable.');
  throw new HttpError(501,'DOCUMENT_PENDING','Secure receipt generation is pending. No document is available.');
 }
 throw new HttpError(404,'NOT_FOUND','Student capability was not found.');
}
