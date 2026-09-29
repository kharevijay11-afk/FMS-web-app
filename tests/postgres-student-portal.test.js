import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostgresStudentPortal} from '../services/api/src/repositories/postgres-student-portal.js';

test('PostgreSQL student portal projects owned finance, notices and certificate state',async()=>{
 const pool={query:async sql=>{
  if(sql.startsWith('SELECT * FROM students'))return{rowCount:1,rows:[{id:'student-1',student_id:'CC-1',display_name:'Student',mobile:'9999999999',email:null,address:'Rajnandgaon',course_name:'DCA',batch_name:'Morning',session_name:'2026-27',status:'completed',admission_date:'2026-01-01',course_end_date:'2026-06-30',total_fee_paise:100000,admission_details:{duration:'6 months'}}]};
  if(sql.includes('FROM admin_notice_recipients')&&sql.includes('n.status'))return{rows:[{id:'notice-1',title:'Exam',message:'Bring your ID card.',created_at:'2026-06-01',read_at:null}]};
  if(sql.startsWith('SELECT * FROM certificates'))return{rows:[{certificate_type:'main',certificate_number:'CERT-1',issue_date:'2026-07-01'}]};
  throw Error(`Unexpected query: ${sql}`);
 }};
 const finance={financeStudent:async()=>({totalPaise:100000,paidPaise:100000,outstandingPaise:0,due:null,installments:[],payments:[{id:'pay-1',documentId:'pay-1',status:'posted'}],receipts:[{id:'pay-1'}]})};
 const portal=await createPostgresStudentPortal(pool,finance).getStudentPortal('student-1');
 assert.equal(portal.source,'postgres');assert.equal(portal.unreadNoticeCount,1);assert.equal(portal.fee.paymentStatus,'Paid');assert.equal(portal.receipts[0].documentStatus,'available');assert.equal(portal.certificates[0].number,'CERT-1');assert.equal(portal.credentials.status,'protected');
});

test('PostgreSQL notice read is scoped to the signed-in student and reports idempotent change',async()=>{
 const calls=[];const pool={query:async(sql,args)=>{calls.push(args);if(sql.startsWith('WITH prior'))return{rowCount:1,rows:[{changed:false}]};return{rows:[{id:'notice-1',title:'Notice',message:'Message',created_at:'2026-01-01',read_at:'2026-01-02'}]};}};
 const result=await createPostgresStudentPortal(pool,{}).markStudentNoticeRead('student-1','notice-1');
 assert.equal(result.changed,false);assert.equal(result.notice.readAt,'2026-01-02');assert.deepEqual(calls,[['student-1','notice-1'],['student-1','notice-1']]);
});
