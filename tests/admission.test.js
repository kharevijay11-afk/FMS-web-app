import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAdmission,nextStudentNumber,admissionSession} from '../packages/domain/src/admission.js';
import {createSyntheticStep3Repository} from '../services/api/src/repositories/synthetic-step3.js';
const event={actorUserId:'usr-admin',actorRole:'admin',requestId:'test',outcome:'success'};
const options=key=>({key,event});
const body={name:'test STUDENT',mobile:'9999999999',courseId:'office-demo',admissionDate:'2026-01-31'};
const course={id:'course',name:'Test Course',code:'CVRU-DEMO',duration:'3 months',fee:1000};
const draft={...body,courseId:'course'};
const repo=()=>createSyntheticStep3Repository({});
test('LAN numbering: four digits minimum, configured prefix, case-insensitive max suffix, persistent high-water counter',()=>{
 assert.deepEqual(nextStudentNumber('CC-',1,[]),{studentId:'CC-0001',next:2});
 assert.equal(nextStudentNumber('CC-',1,['cc-0009','CC-0100','CC-bad','OTHER-9999']).studentId,'CC-0101');
 assert.equal(nextStudentNumber('NEW.',10001,['NEW.0001']).studentId,'NEW.10001');
 assert.equal(nextStudentNumber('CC-',50,['CC-0001']).studentId,'CC-0050');
});
test('LAN admission: July default even in January; legacy session normalization',()=>{
 assert.equal(admissionSession('2026-01-01'),'July 26-27');assert.equal(admissionSession('2026-08-01','jan 26-27'),'Jan 26-27');assert.equal(admissionSession('2026-01-01','2025-26'),'July 25-26');assert.equal(admissionSession('2026-01-01','Historic Session'),'Historic Session');
});
test('LAN admission defaults and automatic monthly plan preserve rupee split and month-end clamping',()=>{
 const s=prepareAdmission(draft,[course]);assert.equal(s.status,'active');assert.equal(s.name,'Test Student');assert.equal(s.batch,'');assert.equal(s.fee.paidPaise,0);assert.equal(s.guardian,'');assert.equal(s.addonEnabled,false);
 assert.deepEqual(s.installments.map(p=>[p.dueDate,p.amountPaise]),[['2026-01-31',33300],['2026-02-28',33300],['2026-03-31',33400]]);
 assert.equal(prepareAdmission({...draft,fee:0},[course]).installments.length,0);
 assert.equal(prepareAdmission(draft,[{...course,duration:''}]).installments.length,1);
});
test('LAN CVRU add-on, discount clamp and custom plan sorting/renumbering',()=>{
 const s=prepareAdmission({...draft,addonEnabled:true,addonFee:100,discount:100,abcId:'abc',installments:[{installmentNo:3,dueDate:'2026-03-01',amount:600},{installmentNo:1,dueDate:'2026-01-01',amount:400,remark:'FIRST PAYMENT'}]},[course]);
 assert.equal(s.abcId,'ABC');assert.equal(s.fee.totalPaise,100000);assert.deepEqual(s.installments.map(p=>[p.installmentNo,p.amountPaise]),[[1,40000],[2,60000]]);assert.equal(s.installments[0].remark,'First Payment');
 const non=prepareAdmission({...draft,addonEnabled:true,addonFee:100,abcId:'abc'},[{...course,code:'OTHER'}]);assert.equal(non.addonFeePaise,0);assert.equal(non.abcId,'');
 assert.equal(prepareAdmission({...draft,discount:2000},[course]).fee.totalPaise,0);
});
test('Admission rejects unknown fields, invalid dates, unavailable courses, malformed amounts and plans',()=>{
 for(const patch of [{studentId:'CC-9999'},{name:''},{mobile:'bad'},{courseId:'missing'},{admissionDate:'2026-02-30'},{fee:-1},{fee:0.001},{addonEnabled:true,addonFee:0},{installments:[{dueDate:'2026-01-01',amount:1}]},{installments:[{dueDate:'bad',amount:1000}]},{skipBatchCapacityCheck:true}])assert.throws(()=>prepareAdmission({...draft,...patch},[course]),e=>e.status===422);
});
test('Inquiry conversion is serialized, retains original notes and emits linked audit history',async()=>{
 const r=repo(),q=await r.addInquiry({name:'Inquiry Person',mobile:'9999999999',course:'Office & Data Skills',message:'address NOTE',consent:true});
 const payload={courseId:'office-demo',version:1};
 const result=await Promise.allSettled(['one','two'].map(key=>r.admissionCreate(payload,{...options(key),inquiryId:q.id})));
 assert.equal(result.filter(v=>v.status==='fulfilled').length,1);assert.equal(result.find(v=>v.status==='rejected').reason.code,'ALREADY_CONVERTED');
 const s=result.find(v=>v.status==='fulfilled').value.student;assert.equal(s.studentId,'CC-0001');assert.equal(s.address,'Address Note');assert.equal(q.message,'address NOTE');assert.equal(q.status,'converted');assert.equal(q.studentRecordId,s.id);assert.equal(s.inquiryId,q.id);assert.equal((await r.listStudents()).length,3);assert.equal((await r.managementHistory('students',s.id))[0].action,'INQUIRY_CONVERT');
});
test('Admission request replay returns same student and rejects changed payload without consuming an ID',async()=>{
 const r=repo(),first=await r.admissionCreate(body,options('same')),repeat=await r.admissionCreate(body,options('same'));assert.equal(repeat.replayed,true);assert.equal(repeat.student.id,first.student.id);
 await assert.rejects(r.admissionCreate({...body,name:'Changed'},options('same')),e=>e.code==='IDEMPOTENCY_CONFLICT');
 const second=await r.admissionCreate(body,options('next'));assert.equal(second.student.studentId,'CC-0002');assert.equal((await r.listStudents()).length,4);
});
test('Full batch validation counts active students across courses and case variants; left records free seats',async()=>{
 const r=repo();for(let i=0;i<14;i++)await r.admissionCreate({...body,batch:i%2?'MORNING 08:00':'Morning 08:00'},options('seat'+i));
 await assert.rejects(r.admissionCreate({...body,courseId:'dca-demo',batch:'morning 08:00'},options('full')),e=>e.code==='BATCH_FULL');
 const left=await r.admissionCreate({...body,batch:'Morning 08:00',status:'left'},options('left'));assert.equal(left.student.studentId,'CC-0015');
 await r.managementUpdate('students','student-demo-001',{status:'left'},1,{...event,action:'STUDENT_MARK_LEFT',entityType:'student',entityId:'student-demo-001'});
 const admitted=await r.admissionCreate({...body,batch:'Morning 08:00'},options('free'));assert.equal(admitted.student.studentId,'CC-0016');
});
test('Audit failure rolls back conversion, numbering and idempotency registration',async()=>{
 const r=repo(),q=await r.addInquiry({name:'Test Person',mobile:'9999999999',course:'Office & Data Skills',message:'keep'}),audit=r.audit;r.audit=async()=>{throw Error('Audit failed');};
 await assert.rejects(r.admissionCreate({...body,version:1},{...options('failed'),inquiryId:q.id}),/Audit failed/);assert.equal(q.status,'new');assert.equal(q.studentRecordId,undefined);assert.equal((await r.listStudents()).length,2);
 r.audit=audit;const saved=await r.admissionCreate({...body,version:1},{...options('failed'),inquiryId:q.id});assert.equal(saved.student.studentId,'CC-0001');
});
test('Admission preserves other students, fees and portal fixtures; new record supports edit/search/mark-left',async()=>{
 const r=repo(),before=structuredClone(await r.listStudents()),portal=await r.getStudentPortal('student-demo-001');const {student}=await r.admissionCreate(body,options('new'));
 assert.deepEqual((await r.listStudents()).slice(0,2),before);assert.deepEqual(await r.getStudentPortal('student-demo-001'),portal);
 await r.managementUpdate('students',student.id,{name:'Changed Name',status:'left'},1,{...event,action:'STUDENT_MARK_LEFT',entityType:'student',entityId:student.id});
 const list=await r.managementList('students',{query:student.studentId,status:'left',page:1,pageSize:20,sort:'newest'});assert.equal(list.total,1);assert.equal(list.items[0].name,'Changed Name');assert.deepEqual(list.items[0].fee,student.fee);
});
