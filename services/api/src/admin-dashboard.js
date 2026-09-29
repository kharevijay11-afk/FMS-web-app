import { ADMIN_NAVIGATION, visibleNavigation } from '../../../packages/domain/src/admin-navigation.js';
import { PERMISSIONS, hasPermission } from '../../../packages/domain/src/rbac-step3.js';
import { createStudentPortalFixtures } from './repositories/student-portal-fixtures.js';
import { HttpError, sendJson } from './lib/http.js';

// Compose existing read models on the server. Never infer cumulative dues from fee balance.
export async function dashboardSummary(repo, user) {
  const financial = hasPermission(user, 'system:admin');
  const synthetic = repo.kind === 'synthetic';
  const students = synthetic ? await repo.listStudents() : [];
  const inquiries = await repo.listInquiries();
  const fixtures = synthetic ? createStudentPortalFixtures() : new Map();
  const counts = {totalStudents:null,activeStudents:null,leftStudents:null,totalInquiries:null,pendingInquiries:null,convertedInquiries:null,dueStudents:null,certificatesIssued:null,activeBatches:null};
  const collections = {today:null,month:null,totalDue:null};
  const result = {source:repo.kind,asOf:synthetic?'2026-09-11':null,notice:synthetic?'Synthetic preview Ã‚Â· financial snapshot 11 September 2026. Total Due is outstanding fee balance; scheduled dues use existing cumulative snapshots.':'Dashboard aggregation integration pending. Recent inquiries use the existing repository.',counts,collections,recentInquiries:inquiries.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5).map(i=>({id:i.id,inquiryNo:i.inquiryNo,name:i.name,mobile:i.mobile,course:i.course,date:i.createdAt,status:i.status})),recentPayments:[],upcomingDues:[],courseWiseCollection:[],batches:[]};
  if (repo.academicDashboardSummary) {
    const academic = await repo.academicDashboardSummary();
    Object.assign(result.counts, academic.counts);
    result.batches = academic.batches;
  }
  if (!synthetic) return result; // PostgreSQL list methods are capped; never present their length as a total.
  Object.assign(counts,{totalStudents:students.length,activeStudents:students.filter(s=>s.status==='active').length,leftStudents:students.filter(s=>s.status==='left').length,totalInquiries:inquiries.length,pendingInquiries:inquiries.filter(i=>['new','contacted'].includes(i.status)).length,convertedInquiries:inquiries.filter(i=>i.status==='converted').length});
  if (!financial) return result;
  const payments=students.flatMap(s=>(fixtures.get(s.id)?.payments||[]).filter(p=>p.status==='Posted').map(p=>({student:s.name,studentId:s.studentId,receiptNumber:p.receiptNumber,date:p.date,amountPaise:p.amountPaise})));
  collections.today=payments.filter(p=>p.date===result.asOf).reduce((n,p)=>n+p.amountPaise,0);
  collections.month=payments.filter(p=>p.date.startsWith(result.asOf.slice(0,7))).reduce((n,p)=>n+p.amountPaise,0);
  collections.totalDue=students.reduce((n,s)=>n+s.fee.duePaise,0);
  counts.dueStudents=students.filter(s=>s.fee.duePaise>0).length;
  counts.certificatesIssued=[...fixtures.values()].reduce((n,p)=>n+p.certificates.filter(c=>c.issued).length,0);
  result.recentPayments=payments.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  result.upcomingDues=students.filter(s=>s.fee.duePaise>0).map(s=>{const d=fixtures.get(s.id)?.dues;return{student:s.name,course:s.course,date:d?.nextDueDate||s.nextInstallment?.dueDate||null,amountPaise:d?.nextCumulativeDuePaise??null,status:d?.nextCumulativeDuePaise==null?'Custom plan integration pending':'Upcoming Ã‚Â· cumulative, includes carry-forward'}});
  for (const course of new Set(students.map(s=>s.course))) {const rows=students.filter(s=>s.course===course);result.courseWiseCollection.push({course,studentCount:rows.length,collectionPaise:rows.reduce((n,s)=>n+s.fee.paidPaise,0),dueStudents:rows.filter(s=>s.fee.duePaise>0).length,duePaise:rows.reduce((n,s)=>n+s.fee.duePaise,0)});}
  // Existing default capacity is 15. These are labelled synthetic groups, not admission mutations.
  if (!repo.academicDashboardSummary) for (const batch of new Set(students.map(s=>s.batch))) {const rows=students.filter(s=>s.batch===batch&&s.status==='active');result.batches.push({batch,course:students.find(s=>s.batch===batch)?.course||'',currentStudents:rows.length,capacity:15,availableSeats:Math.max(0,15-rows.length),status:rows.length>=15?'Full':'Available'});}
  counts.activeBatches=result.batches.length;
  return result;
}

export async function adminDashboardRoute(req,res,url,{repo,auth,allow}) {
  const route=url.pathname;
  if (!['/api/v1/admin/dashboard/summary','/api/v1/admin/navigation'].includes(route)&&!route.startsWith('/api/v1/admin/modules/')) return false;
  const {user}=await auth(req);
  allow(user,'admin:dashboard:read');
  if(req.method!=='GET')throw new HttpError(405,'METHOD_NOT_ALLOWED','This view is read-only.');
  if(route.endsWith('/dashboard/summary'))sendJson(res,200,await dashboardSummary(repo,user));
  else if(route.endsWith('/navigation'))sendJson(res,200,{items:visibleNavigation(PERMISSIONS[user.role])});
  else {const item=ADMIN_NAVIGATION.find(i=>i.id===decodeURIComponent(route.slice('/api/v1/admin/modules/'.length)));if(!item)throw new HttpError(404,'NOT_FOUND','Module was not found.');allow(user,item.permission);sendJson(res,200,{module:item.id,title:item.label,status:'pending',message:'Module integration scheduled for Step 6BÃ¢â‚¬â€œ6F.'});}
  return true;
}
