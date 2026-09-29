import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createStep3App } from '../services/api/src/app-step3.js';
import { loadConfig } from '../services/api/src/config-step3.js';
import { createSyntheticStep3Repository } from '../services/api/src/repositories/synthetic-step3.js';
import { createStudentPortalFixtures, fullyPaidScenario } from '../services/api/src/repositories/student-portal-fixtures.js';
import { makePasswordRecord, totp } from '../services/api/src/lib/security-step3.js';
import { renderStudentPage, sections } from '../apps/student-portal/views.js';
async function setup(t){const config={...loadConfig(),origin:'http://127.0.0.1',port:0},repo=createSyntheticStep3Repository(config);const server=createStep3App(config,repo);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());return{base:`http://127.0.0.1:${server.address().port}`,repo};}
async function post(base,path,body,session,extra={}){return fetch(base+'/api/v1'+path,{method:'POST',headers:{Origin:'http://127.0.0.1','Content-Type':'application/json',...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{}),...extra},body:JSON.stringify(body||{})});}
async function login(base,userId='STU-DEMO-001',password='Student!123'){let r=await post(base,'/auth/login',{userId,password}),body=await r.json();if(body.mfaRequired){r=await post(base,'/auth/mfa/verify',{challengeId:body.challengeId,code:totp('JBSWY3DPEHPK3PXP')});body=await r.json();}assert.equal(r.status,200);return{cookie:r.headers.get('set-cookie').split(';')[0],csrf:body.csrfToken};}
const get=(base,path,session)=>fetch(base+'/api/v1'+path,{headers:session?{Cookie:session.cookie}:{}});
async function secondStudent(repo,base){await repo.createAccountToken('usr-activate','activation','test-activation',Date.now()+60000);await repo.consumeAccountToken('test-activation','activation',makePasswordRecord('SecondDemo!123'));return login(base,'STU-ACT-002','SecondDemo!123');}
test('Step 5 own summary/profile are session-owned; guessed IDs and cross-student documents fail',async t=>{
 const{base,repo}=await setup(t),first=await login(base),second=await secondStudent(repo,base);
 const summary=await(await get(base,'/students/me/summary',first)).json();assert.equal(summary.student.studentId,'STU-DEMO-001');
 const response=await get(base,'/students/me/portal',first),own=(await response.json()).portal;assert.equal(own.profile.email,'aarav@example.test');assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(response.headers.get('x-request-id'));
 assert.equal((await get(base,'/students/student-demo-002/summary',first)).status,403);
 assert.equal((await get(base,'/students/me/portal?studentId=student-demo-002',first)).status,400);
 const other=(await(await get(base,'/students/me/portal',second)).json()).portal;assert.equal(other.course.code,'OFFICE-DEMO');assert.equal(JSON.stringify(other).includes('aarav@example.test'),false);
 assert.equal((await get(base,'/students/me/receipts/receipt-a-1/document',second)).status,404);
 assert.equal((await get(base,'/students/me/receipts/receipt-a-1/document',first)).status,501);
 assert.equal((await get(base,'/students/me/receipts/missing/document',first)).status,404);
});
test('Step 5 student endpoints reject anonymous, staff and admin while admin summary remains separate',async t=>{
 const{base}=await setup(t);assert.equal((await get(base,'/students/me/portal')).status,401);
 for(const id of ['staff@example.test','admin@example.test']){const session=await login(base,id,'ChangeMe!123');assert.equal((await get(base,'/students/me/portal',session)).status,403);assert.equal((await get(base,'/students/me/summary',session)).status,403);assert.equal((await get(base,'/students/student-demo-001/summary',session)).status,200);assert.equal((await post(base,'/students/me/notices/notice-a-1/read',{},session)).status,403);}
 const student=await login(base);assert.equal((await get(base,'/admin/students',student)).status,403);
});
test('Step 5 financial fixture respects fee formula and posted payments match existing summary',async t=>{
 const{repo}=await setup(t),student=await repo.findStudent('student-demo-001'),portal=await repo.getStudentPortal(student.id),f=portal.fee;
 assert.equal(f.courseFeePaise+f.addOnFeePaise-f.discountPaise,student.fee.totalPaise);
 assert.equal(portal.payments.reduce((sum,p)=>sum+p.amountPaise,0),student.fee.paidPaise);
 assert.equal(student.fee.totalPaise-student.fee.paidPaise,student.fee.duePaise);
 assert.equal(portal.installments.reduce((sum,i)=>sum+i.plannedPaise,0),student.fee.totalPaise);
});
test('Step 5 custom installment snapshot carries partial shortage forward without equal allocation',()=>{
 const p=createStudentPortalFixtures().get('student-demo-001'),[first,partial,next,last]=p.installments;
 assert.equal(first.remainingPaise,0);assert.equal(partial.cumulativePlannedPaise-partial.cumulativePaidPaise,300000);
 assert.equal(next.remainingPaise,partial.remainingPaise+next.plannedPaise);assert.equal(last.remainingPaise,next.remainingPaise+last.plannedPaise);
 assert.equal(p.dues.currentDuePaise,partial.remainingPaise);assert.equal(p.dues.nextCumulativeDuePaise,next.remainingPaise);assert.match(p.dues.reminder,/seven days/);
 assert.ok(new Set(p.installments.map(i=>i.plannedPaise)).size>1);
});
test('Step 5 fully-paid fixture has zero balance, zero scheduled due and empty due list',()=>{
 const f=fullyPaidScenario;assert.equal(f.courseFeePaise+f.addOnFeePaise-f.discountPaise,f.totalPaise);assert.equal(f.totalPaise-f.paidPaise,f.duePaise);assert.equal(f.duePaise,0);assert.equal(f.currentDuePaise,0);assert.deepEqual(f.dueList,[]);assert.equal(f.certificateIssued,false);
});
test('Step 5 payment history is read-only and no payment mutation route is introduced',async t=>{
 const{base,repo}=await setup(t),session=await login(base),before=(await repo.getStudentPortal('student-demo-001')).payments;
 for(const method of ['POST','PATCH','DELETE']){const r=await fetch(base+'/api/v1/students/me/payments/pay-a-1',{method,headers:{Cookie:session.cookie,Origin:'http://127.0.0.1','X-CSRF-Token':session.csrf}});assert.equal(r.status,404);}
 assert.deepEqual((await repo.getStudentPortal('student-demo-001')).payments,before);
});
test('Step 5 notice read requires authentication, own audience, same origin and CSRF; retries preserve read time',async t=>{
 const{base,repo}=await setup(t),session=await login(base);
 assert.equal((await post(base,'/students/me/notices/notice-a-1/read')).status,401);
 assert.equal((await post(base,'/students/me/notices/notice-a-1/read',{},session,{'X-CSRF-Token':''})).status,403);
 assert.equal((await post(base,'/students/me/notices/notice-a-1/read',{},session,{Origin:'https://other.invalid'})).status,403);
 assert.equal((await post(base,'/students/me/notices/notice-b-1/read',{},session)).status,404);
 const first=await(await post(base,'/students/me/notices/notice-a-1/read',{},session)).json();const second=await(await post(base,'/students/me/notices/notice-a-1/read',{},session)).json();assert.ok(first.notice.readAt);assert.equal(first.notice.readAt,second.notice.readAt);
 assert.equal((await repo.getStudentPortal('student-demo-001')).unreadNoticeCount,0);assert.equal((await repo.getStudentPortal('student-demo-002')).unreadNoticeCount,1);
 const audits=(await repo.listAudit()).filter(e=>e.action==='STUDENT_NOTICE_READ');assert.equal(audits.length,1);assert.equal(Object.isFrozen(audits[0]),true);
});
test('Step 5 certificate snapshots preserve 40/50/60 payment gates and never infer issuance',()=>{
 const p=createStudentPortalFixtures().get('student-demo-001');assert.deepEqual(p.certificates.slice(1).map(c=>c.thresholdPercent),[40,50,60]);
 for(const c of p.certificates.slice(1)){assert.equal(c.paymentGateMet,750000*100>=1800000*c.thresholdPercent);assert.equal(c.issued,false);assert.equal(c.number,null);assert.match(c.reason,/Course-end/);}
 assert.equal(p.certificates[0].eligibility,'Not eligible');assert.match(p.certificates[0].reason,/completion and full payment/);
});
test('Step 5 resources stay course/session scoped and portal response has no credential secrets',async t=>{
 const{repo}=await setup(t);for(const id of ['student-demo-001','student-demo-002']){const p=await repo.getStudentPortal(id);for(const r of p.resources){assert.equal(r.courseCode,p.course.code);assert.equal(r.session,p.course.session);assert.equal(r.downloadUrl,null);}assert.deepEqual(Object.keys(p.credentials).sort(),['message','status']);}
});
test('Step 5 synthetic recovery revokes prior sessions, matching PostgreSQL behavior',async t=>{
 const{base}=await setup(t),session=await login(base),request=await(await post(base,'/auth/recovery/request',{userId:'STU-DEMO-001'})).json();const result=await post(base,'/auth/recovery/confirm',{token:request.syntheticToken,password:'RecoveredDemo!123'});assert.equal(result.status,200);assert.equal((await get(base,'/students/me/summary',session)).status,401);
});
test('Step 5 unsupported persistence returns pending and never fabricates synthetic student records',async t=>{
 const{base,repo}=await setup(t),session=await login(base);delete repo.getStudentPortal;delete repo.markStudentNoticeRead;
 const p=(await(await get(base,'/students/me/portal',session)).json()).portal;assert.equal(p.status,'pending');assert.equal(p.profile,undefined);assert.equal((await post(base,'/students/me/notices/notice-a-1/read',{},session)).status,501);
});
test('Step 5 modular contracts and all views resolve; private display content is escaped',async t=>{
 const{repo}=await setup(t),s=await repo.findStudent('student-demo-001'),p=await repo.getStudentPortal(s.id);
 for(const[id]of sections)assert.ok(!renderStudentPage(id,s,p).includes('section could not be found'));
 assert.ok(renderStudentPage('dashboard',{...s,name:'<img src=x onerror=alert(1)>'},p).includes('&lt;img'));
 const schema=JSON.parse((await readFile(new URL('../packages/contracts/student-portal.schema.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));assert.equal(schema.properties.credentials.additionalProperties,false);
 const api=await readFile(new URL('../packages/contracts/openapi.yaml',import.meta.url),'utf8');for(const path of ['/students/me/portal:','/students/me/notices/{noticeId}/read:','/students/me/receipts/{receiptId}/document:'])assert.ok(api.includes(path));
});
