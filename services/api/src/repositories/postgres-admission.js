import {createHash,randomUUID} from 'node:crypto';
import {HttpError} from '../lib/http.js';
import {prepareAdmission,nextStudentNumber,checkConversion,checkCapacity} from '../../../../packages/domain/src/admission.js';
export function createPostgresAdmission(pool){
 const references=async client=>{const c=await client.query('SELECT id::text,name,code,duration,fee_paise FROM admission_courses ORDER BY name'),b=await client.query('SELECT batch_name AS batch,capacity FROM admission_batches ORDER BY batch_name');return{courses:c.rows.map(c=>({...c,fee:Number(c.fee_paise)/100})),batches:b.rows};};
 return {
  async admissionReferences(){return references(pool);},
  async admissionCreate(body,{inquiryId=null,key,event}){
   const hash=createHash('sha256').update(JSON.stringify({body,inquiryId})).digest('hex'),client=await pool.connect();try{
    await client.query('BEGIN');
    // One transaction lock covers numbering, capacity, replay and conversion commits.
    await client.query("SELECT pg_advisory_xact_lock(60602026)");
    const replay=await client.query('SELECT request_hash,response FROM admission_requests WHERE request_key=$1',[key]);
    if(replay.rowCount){if(replay.rows[0].request_hash!==hash)throw new HttpError(409,'IDEMPOTENCY_CONFLICT','This request key was already used for different admission details.');await client.query('COMMIT');return{...replay.rows[0].response,replayed:true};}
    let inquiry=null;if(inquiryId){if(!/^[0-9a-f-]{36}$/i.test(inquiryId))throw new HttpError(404,'NOT_FOUND','Inquiry was not found.');const q=await client.query('SELECT * FROM inquiries WHERE id=$1 FOR UPDATE',[inquiryId]);inquiry=q.rows[0];if(inquiry)inquiry.studentRecordId=inquiry.student_record_id;checkConversion(inquiry,body.version);}
    const refs=await references(client),student=prepareAdmission(body,refs.courses,inquiry),existing=await client.query('SELECT student_id,status,batch_name FROM students');
    checkCapacity(student,existing.rows.map(s=>({status:s.status,batch:s.batch_name})),refs.batches);
    const settings=(await client.query('SELECT prefix,next_number FROM admission_numbering WHERE singleton=true FOR UPDATE')).rows[0];if(!settings)throw new HttpError(503,'ADMISSION_SETUP_REQUIRED','Student numbering configuration is missing.');
    const number=nextStudentNumber(settings.prefix,Number(settings.next_number),existing.rows.map(s=>s.student_id)),id=randomUUID(),now=new Date().toISOString();
    const row={...student,id,studentId:number.studentId,version:1,createdAt:now,updatedAt:now,inquiryId};
    await client.query('INSERT INTO students(id,student_id,display_name,mobile,address,course_name,batch_name,session_name,status,admission_date,total_fee_paise,paid_paise,next_installment_date,next_installment_paise,admission_details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,$12,$13,$14)',[id,row.studentId,row.name,row.mobile,row.address,row.course,row.batch,row.session,row.status,row.admissionDate,row.fee.totalPaise,row.nextInstallment?.dueDate||null,row.nextInstallment?.amountPaise||null,row]);
    for(const p of row.installments)await client.query('INSERT INTO admission_installments(student_id,installment_no,due_date,amount_paise,remark) VALUES($1,$2,$3,$4,$5)',[id,p.installmentNo,p.dueDate,p.amountPaise,p.remark]);
    if(inquiryId)await client.query("UPDATE inquiries SET status='converted',student_record_id=$1,version=version+1,updated_at=now() WHERE id=$2",[id,inquiryId]);
    for(const audit of [{...event,action:'STUDENT_ADMISSION_CREATE',entityType:'student',entityId:id},...(inquiryId?[{...event,action:'INQUIRY_CONVERT',entityType:'inquiry',entityId:inquiryId}]:[])])await client.query('INSERT INTO audit_events(actor_user_id,actor_role,action,entity_type,entity_id,request_id,ip_hash,outcome,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[audit.actorUserId,audit.actorRole,audit.action,audit.entityType,audit.entityId,audit.requestId,audit.ipHash,audit.outcome,{studentRecordId:id,inquiryId}]);
    await client.query('UPDATE admission_numbering SET next_number=$1 WHERE singleton=true',[number.next]);const result={student:row};
    await client.query('INSERT INTO admission_requests(request_key,request_hash,response) VALUES($1,$2,$3)',[key,hash,result]);await client.query('COMMIT');return result;
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
 };
}
